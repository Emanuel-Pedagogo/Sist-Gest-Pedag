// SACP — Chat com IA integrado (Claude API)
//
// Fluxo:
//   1) Frontend manda { messages } (histórico completo, formato Anthropic).
//      A função roda um loop de tool-use com a Claude API:
//        - consultar_dados  -> executa SELECT de leitura na hora (RPC sacp_chat_run_select)
//        - propor_alteracao -> só CRIA uma proposta pendente (RPC sacp_chat_propor_escrita);
//                                a escrita real só acontece quando o usuário confirma.
//      Retorna o texto final do assistente + a lista de propostas pendentes geradas nesta rodada + os dados retornados pelas consultas (queryResults).
//   2) Frontend manda { confirmarEscritaId } ou { cancelarEscritaId } para
//      efetivar ou descartar uma proposta pendente.
//
// Segurança:
//   - Nunca usa a service role key. Usa a ANON key + o Authorization (JWT)
//     do usuário logado, então toda consulta/alteração respeita a RLS de
//     cada tabela — exatamente como se o usuário chamasse a REST API direto.
//   - A validação de SQL (whitelist de tabelas, bloqueio de DDL, exigência
//     de WHERE em UPDATE/DELETE, papel coordenador para escrita) é feita
//     no Postgres (supabase_chat_ia.sql), não só aqui — defesa em profundidade.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.1';
import { corsHeaders } from '../_shared/cors.ts';
import { callClaude, type AnthropicMessage, type AnthropicToolDef } from '../_shared/anthropic.ts';

const MAX_TOOL_ITERATIONS = 6;

const TOOLS: AnthropicToolDef[] = [
  {
    name: 'consultar_dados',
    description:
      'Executa uma única consulta SELECT (somente leitura) nas tabelas pedagógicas do SACP e retorna até 200 linhas em JSON. Use sempre que precisar de dados reais (alunos, turmas, escolas, notas, sondagens, ocorrências, agenda, professores etc.) para responder à pergunta do usuário.',
    input_schema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description:
            'Uma única instrução SELECT (ou WITH ... SELECT) em PostgreSQL, sem ponto e vírgula no meio, sem comentários, usando só as tabelas listadas no schema.',
        },
        motivo: {
          type: 'string',
          description: 'Explicação curta do que a consulta busca (fica no log de auditoria e vira o título do relatório se o usuário exportar).',
        },
      },
      required: ['sql'],
    },
  },
  {
    name: 'propor_alteracao',
    description:
      'Propõe uma alteração de dados (INSERT, UPDATE ou DELETE) em uma tabela pedagógica. A alteração NÃO é executada agora: fica pendente até o usuário confirmar explicitamente na tela. Só coordenação pode propor. UPDATE/DELETE sempre precisam de WHERE. Não inclua RETURNING. Prefira sempre esta ferramenta a tentar "convencer" o usuário a editar manualmente — o chat deve propor e esperar confirmação.',
    input_schema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'Uma única instrução INSERT/UPDATE/DELETE em PostgreSQL, sem RETURNING.',
        },
        descricao: {
          type: 'string',
          description:
            'Descrição curta e clara em português do que a alteração vai fazer — será mostrada ao usuário no pedido de confirmação.',
        },
      },
      required: ['sql', 'descricao'],
    },
  },
];

const SCHEMA_DOC = `
Tabelas disponíveis (schema public, todas com RLS ativo — coordenador enxerga tudo; professor só as próprias turmas/alunos):

- escolas(id uuid, nome, tipo_zona[Urbana|Rural], tipo_estrutura[Polo|Anexa], endereco, inep, arquivada bool, configuracoes jsonb)
- turmas(id uuid, escola_id uuid, nome, codigo, ano_escolar text[], ano_letivo int, turma_especial bool, professor_regente, aluno_representante)
- alunos(id uuid, turma_id uuid, nome, matricula, data_nascimento, etiqueta_cor[azul|verde|amarelo|vermelho|roxo], motivo_etiqueta, nivel_leitura, frequencia_percentual int, responsavel, contato, aee_deficiencia, aee_cid, aee_tem_laudo bool, aee_plano_individual, aee_mediadora)
- ocorrencias(id uuid, aluno_id uuid, titulo, descricao, tipo, data_ocorrencia date)
- sondagens(id uuid, aluno_id uuid, data date, nivel_leitura, nivel_escrita, observacoes, arquivo_url, foto_escrita_url, audio_leitura_url)
- notas_boletim(id bigint, aluno_id uuid, disciplina, bimestre int[1-4], nota numeric, faltas int, falta smallint, rs1 numeric, rs2 numeric)
- notas(id uuid, aluno_id uuid, disciplina, periodo, ano int, nota numeric, data_registro date)  -- legado, poucos dados
- frequencia_historico(id uuid, aluno_id uuid, mes_referencia, ano int, percentual int, observacao)  -- legado
- agenda_eventos(id uuid, escola_id uuid, turma_id uuid, titulo, descricao, data_inicio timestamptz, data_fim timestamptz, tipo_marco, origem[usuario|sem_ed], nivel_planejamento, cor_etiqueta, anotacoes)
- professores(id uuid, user_id uuid, escola_id uuid, nome, disciplina, turmas_ids uuid[], ano_letivo int, auth_email)
- entregas_docentes(id uuid, professor_id uuid, escola_id uuid, tipo_documento, referencia, status[pendente|entregue|atrasado], prazo date, observacoes)
- registros_coordenacao(id uuid, professor_id uuid, escola_id uuid, assunto, data_conversa date, relato, encaminhamentos)
- alunos_turmas_especiais(id uuid, aluno_id uuid, turma_id uuid)
- diario_frequencia_especial(id uuid, turma_id uuid, aluno_id uuid, data date, status[P|F])
- diario_classe_frequencia(id uuid, turma_id uuid, aluno_id uuid, professor_id uuid, data date, status[P|F])
- diario_classe_conteudos(id uuid, turma_id uuid, professor_id uuid, data date, disciplina, conteudo_aplicado, observacoes)
- relatorio_avaliacao_pre(id uuid, aluno_id uuid, bimestre smallint[1-4], relatorio)
- livros_biblioteca(id bigint, titulo, autor, codigo)  -- recurso experimental, hoje sem dados reais
- emprestimos_biblioteca(id bigint, livro_id bigint, aluno_id uuid, aluno_nome, turma_nome, livro_titulo, livro_codigo, data_emprestimo date, data_prevista_devolucao date, data_devolucao date)
`.trim();

// Tabelas cuja relação com a escola precisa ser garantida em toda consulta/alteração do chat.
// "livros_biblioteca" fica de fora de propósito: é catálogo geral, sem relação com escola.
const ESCOLA_SCOPED_TABLES = [
  'escolas',
  'turmas',
  'alunos',
  'ocorrencias',
  'sondagens',
  'notas_boletim',
  'notas',
  'frequencia_historico',
  'agenda_eventos',
  'professores',
  'entregas_docentes',
  'registros_coordenacao',
  'alunos_turmas_especiais',
  'diario_frequencia_especial',
  'diario_classe_frequencia',
  'diario_classe_conteudos',
  'relatorio_avaliacao_pre',
  'emprestimos_biblioteca',
];

const ESCOLA_RELATION_DOC = `
Como cada tabela chega até a escola (todo filtro precisa alcançar essa cadeia usando o id exato da escola ativa):
- Direto (coluna escola_id): escolas (id), turmas, agenda_eventos, professores, entregas_docentes, registros_coordenacao
- Via turma_id -> turmas.escola_id: alunos, alunos_turmas_especiais, diario_frequencia_especial, diario_classe_frequencia, diario_classe_conteudos
- Via aluno_id -> alunos.turma_id -> turmas.escola_id: ocorrencias, sondagens, notas_boletim, notas, frequencia_historico, relatorio_avaliacao_pre, emprestimos_biblioteca
- Sem relação com escola (catálogo geral, não precisa filtrar): livros_biblioteca
`.trim();

function sqlTouchesEscolaScopedTable(sql: string): boolean {
  const lower = sql.toLowerCase();
  return ESCOLA_SCOPED_TABLES.some((t) => new RegExp(`\\b${t}\\b`).test(lower));
}

function sqlIncludesEscolaFilter(sql: string, escolaId: string): boolean {
  return sql.toLowerCase().includes(escolaId.toLowerCase());
}

function buildSystemPrompt(
  isCoordenador: boolean,
  hoje: string,
  escolaId: string,
  escolaNome: string,
) {
  return `
Você é o assistente de dados do SACP (Sistema de Apoio à Coordenação Pedagógica), uma rede municipal de ensino no Brasil (SEMED/Santarém). Responde SEMPRE em português do Brasil, de forma direta e objetiva.

Papel do usuário atual: ${isCoordenador ? 'coordenação pedagógica (pode consultar tudo e propor alterações)' : 'professor(a) (só consulta os próprios dados; NÃO pode propor alterações)'}.
Data de hoje: ${hoje}.

ESCOLA ATIVA (obrigatório respeitar): "${escolaNome}" (escola_id = '${escolaId}'). Esta é a escola selecionada no topo da tela pelo usuário agora. TODA consulta ("consultar_dados") e TODA alteração ("propor_alteracao") deve ser filtrada exclusivamente para esta escola — nunca retorne, liste ou altere dados de qualquer outra escola, mesmo que o usuário peça explicitamente por nome de outra escola ou peça "todas as escolas"/"a rede toda". Nesses casos, explique educadamente que ele precisa trocar a escola selecionada no seletor no topo da tela para consultar outra escola. Use sempre o valor literal '${escolaId}' na cláusula de filtro (diretamente em escola_id, ou na cadeia turma_id/aluno_id até chegar em turmas.escola_id, conforme o mapa abaixo). Uma consulta sem esse filtro será rejeitada automaticamente pelo servidor antes de rodar.

${ESCOLA_RELATION_DOC}

${SCHEMA_DOC}

Regras obrigatórias:
1. Para qualquer pergunta que dependa de dados reais, use a ferramenta "consultar_dados" (SELECT). Não invente números, nomes ou situações de alunos.
2. Nunca escreva a etiqueta/rótulo de um aluno como "diagnóstico definitivo" — etiquetas são apoio à decisão pedagógica.
3. Dados de alunos são sensíveis (LGPD, menores de idade). Não exponha mais dados do que o necessário para responder à pergunta; resuma em vez de despejar tabelas inteiras quando possível.
4. Só é permitido SELECT em "consultar_dados" e apenas nas tabelas listadas acima — nunca tente CREATE/ALTER/DROP/GRANT ou acessar schemas auth/storage.
5. Para alterar dados (inserir, atualizar ou apagar), use a ferramenta "propor_alteracao" — ela NUNCA executa na hora, só cria uma proposta que o usuário confirma na tela. Explique com clareza, em "descricao", o que vai mudar antes de propor. UPDATE/DELETE sempre precisam de cláusula WHERE específica (nunca proponha alterar/apagar "todos os registros" de uma vez).
6. Se o usuário pedir uma alteração e ele for professor (não coordenação), explique educadamente que só a coordenação pode confirmar alterações de dados pelo chat.
7. Se uma consulta falhar (tabela/coluna errada, erro de sintaxe, ou bloqueio por falta do filtro de escola), ajuste a query e tente de novo em vez de desistir — mas no máximo algumas tentativas; se continuar falhando, explique o problema ao usuário.
8. Seja conciso. Traga números e listas curtas quando fizer sentido, sem enrolação.
9. O usuário pode baixar em PDF/Word/Excel qualquer tabela de dados que você trouxer com "consultar_dados" — não é preciso gerar o arquivo você mesmo, só preencha "motivo" com um título curto e claro, que vira o nome do relatório.
`.trim();
}

function textFromContent(content: AnthropicMessage['content']): string {
  if (typeof content === 'string') return content;
  return content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text?: string }).text || '')
    .join('\n')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization') || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY não disponíveis na Edge Function.');
    }
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    // Cliente com o JWT do usuário — NUNCA service role. RLS de cada tabela vale normalmente.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json();

    // ---- Ação: confirmar escrita pendente ----
    if (body?.confirmarEscritaId) {
      const { data, error } = await supabase.rpc('sacp_chat_confirmar_escrita', {
        p_confirmacao_id: body.confirmarEscritaId,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      }
      return new Response(JSON.stringify({ ok: true, ...data }), { headers: jsonHeaders });
    }

    // ---- Ação: cancelar escrita pendente ----
    if (body?.cancelarEscritaId) {
      const { data, error } = await supabase.rpc('sacp_chat_cancelar_escrita', {
        p_confirmacao_id: body.cancelarEscritaId,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      }
      return new Response(JSON.stringify({ ok: !!data }), { headers: jsonHeaders });
    }

    // ---- Ação padrão: turno de chat ----
    const incomingMessages: AnthropicMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    if (!incomingMessages.length) {
      return new Response(JSON.stringify({ error: 'messages vazio.' }), { status: 400, headers: jsonHeaders });
    }

    // O chat só opera sobre a escola selecionada no topo da tela — sem isso,
    // não há como garantir que os dados retornados/alterados são só dela.
    const escolaId = typeof body?.escolaId === 'string' ? body.escolaId.trim() : '';
    if (!escolaId) {
      return new Response(
        JSON.stringify({
          reply: 'Selecione uma escola no topo da tela para usar o Chat IA.',
          messages: incomingMessages,
          pendingConfirmations: [],
          queryResults: [],
        }),
        { headers: jsonHeaders },
      );
    }

    // Confirma que a escola existe e que o usuário logado tem acesso a ela
    // (respeitando a RLS da tabela escolas — não usa service role em nenhum ponto).
    const { data: escolaRow, error: escolaError } = await supabase
      .from('escolas')
      .select('id, nome')
      .eq('id', escolaId)
      .maybeSingle();
    if (escolaError || !escolaRow) {
      return new Response(
        JSON.stringify({
          reply: 'Não foi possível confirmar a escola selecionada. Tente selecioná-la novamente no topo da tela.',
          messages: incomingMessages,
          pendingConfirmations: [],
          queryResults: [],
        }),
        { headers: jsonHeaders },
      );
    }
    const escolaNome = String(escolaRow.nome || '');

    const { data: isCoordenador, error: roleError } = await supabase.rpc('sacp_is_coordenador');
    if (roleError) {
      throw new Error(`Não foi possível resolver o papel do usuário: ${roleError.message}`);
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const system = buildSystemPrompt(!!isCoordenador, hoje, escolaId, escolaNome);

    const messages: AnthropicMessage[] = [...incomingMessages];
    const pendingConfirmations: Array<Record<string, unknown>> = [];
    const queryResults: Array<{ motivo: string; sql: string; rows: unknown[] }> = [];

    let finalText = '';
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i += 1) {
      const response = await callClaude({ system, messages, tools: TOOLS });

      messages.push({ role: 'assistant', content: response.content });

      const toolUses = response.content.filter((b) => b.type === 'tool_use') as Array<{
        type: 'tool_use';
        id: string;
        name: string;
        input: Record<string, unknown>;
      }>;

      if (!toolUses.length) {
        finalText = textFromContent(response.content);
        break;
      }

      const toolResults: AnthropicMessage['content'] = [];

      for (const toolUse of toolUses) {
        if (toolUse.name === 'consultar_dados') {
          const sql = String(toolUse.input?.sql || '');

          if (sqlTouchesEscolaScopedTable(sql) && !sqlIncludesEscolaFilter(sql, escolaId)) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              is_error: true,
              content: `Consulta bloqueada pelo servidor: precisa filtrar explicitamente pela escola ativa (escola_id = '${escolaId}', direto ou via turma_id/aluno_id conforme o mapa de relações). Reescreva a query incluindo esse filtro.`,
            });
            continue;
          }

          const { data, error } = await supabase.rpc('sacp_chat_run_select', { p_sql: sql });
          if (error) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              is_error: true,
              content: `Erro ao consultar: ${error.message}`,
            });
          } else {
            const rows = Array.isArray(data) ? data : [];
            if (rows.length) {
              queryResults.push({
                motivo: String(toolUse.input?.motivo || ''),
                sql,
                rows,
              });
            }
            const serialized = JSON.stringify(data ?? []);
            const truncated = serialized.length > 6000 ? `${serialized.slice(0, 6000)}... (truncado)` : serialized;
            toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: truncated });
          }
        } else if (toolUse.name === 'propor_alteracao') {
          const sql = String(toolUse.input?.sql || '');
          const descricao = String(toolUse.input?.descricao || '');

          if (sqlTouchesEscolaScopedTable(sql) && !sqlIncludesEscolaFilter(sql, escolaId)) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              is_error: true,
              content: `Proposta bloqueada pelo servidor: precisa referenciar explicitamente a escola ativa (escola_id = '${escolaId}', direto ou via turma_id/aluno_id conforme o mapa de relações) para garantir que a alteração fica restrita a esta escola. Reescreva incluindo esse filtro/valor.`,
            });
            continue;
          }

          const { data, error } = await supabase.rpc('sacp_chat_propor_escrita', {
            p_sql: sql,
            p_descricao: descricao,
          });
          if (error) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              is_error: true,
              content: `Não foi possível propor a alteração: ${error.message}`,
            });
          } else {
            pendingConfirmations.push(data as Record<string, unknown>);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({ status: 'aguardando_confirmacao', ...data }),
            });
          }
        } else {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            is_error: true,
            content: `Ferramenta desconhecida: ${toolUse.name}`,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });

      if (response.stop_reason !== 'tool_use') {
        finalText = textFromContent(response.content);
        break;
      }
    }

    if (!finalText) {
      finalText =
        'Não consegui concluir a resposta em tempo — tente reformular a pergunta ou pedir algo mais específico.';
    }

    return new Response(
      JSON.stringify({ reply: finalText, messages, pendingConfirmations, queryResults }),
      { headers: jsonHeaders },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});
