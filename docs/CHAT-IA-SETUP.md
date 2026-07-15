# SACP — Chat com IA integrado (Claude API)

Chat embutido no SACP que responde perguntas sobre os dados pedagógicos (consultas
SQL somente leitura, executadas na hora) e pode propor alterações de dados
(INSERT/UPDATE/DELETE), que só são executadas depois de confirmação explícita
do usuário na tela. Acesso restrito à coordenação (não aparece para professores).

## 1. Peças criadas

| Peça | Arquivo | O que faz |
|------|---------|-----------|
| Tabelas + RPCs | `supabase_chat_ia.sql` | `chat_ia_confirmacoes`, `chat_ia_execucoes` (auditoria) + funções `sacp_chat_run_select`, `sacp_chat_propor_escrita`, `sacp_chat_confirmar_escrita`, `sacp_chat_cancelar_escrita`. **Já aplicado no projeto Supabase** (`bzajsqxtaypgkejbmtxi`) via migration `chat_ia_tabelas_e_rpcs`. |
| Edge Function | `supabase/functions/chat-ia/index.ts` | Chama a Claude API, roda o loop de ferramentas (`consultar_dados` / `propor_alteracao`), fala com o Postgres via RPC. **Já implantada** (`chat-ia`, `verify_jwt = true`). |
| Helper Claude | `supabase/functions/_shared/anthropic.ts` | Cliente mínimo da Messages API da Anthropic. |
| Serviço front-end | `src/services/chatIaApi.js` | `sendChatMessage`, `confirmarEscritaChatIa`, `cancelarEscritaChatIa`. |
| Tela do chat | `src/views/ChatIAView.jsx` | UI do chat + cartão de confirmação de alterações. |
| Navegação | `src/App.jsx` | Item "Chat IA" na sidebar (só coordenação) + rota `currentView === 'chat-ia'`. |
| Estilos | `src/App.css` | Classes `.chat-ia-*` (final do arquivo). |

## 2. Passo obrigatório antes de usar: secret da Claude API

A Edge Function só funciona depois de configurar a chave da Anthropic — **isso não
foi feito automaticamente** (a chave é sua, não temos acesso a ela).

No terminal, na pasta do projeto, com Supabase CLI logado e projeto vinculado:

```powershell
cd C:\dev\Sist-Gest-Pedag
supabase secrets set ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
```

Ou pelo Dashboard: **Project Settings → Edge Functions → Secrets** → adicionar
`ANTHROPIC_API_KEY`.

Opcional — trocar o modelo usado (padrão `claude-sonnet-5`):

```powershell
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-5
```

Depois de configurar o secret, **não é necessário** rodar `supabase functions deploy`
de novo (secrets são lidos em tempo de execução) — mas se você editar
`supabase/functions/chat-ia/index.ts` ou `_shared/anthropic.ts` localmente, redeploy com:

```powershell
supabase functions deploy chat-ia
```

## 3. Modelo de segurança (o que já está garantido)

- **Sem service role no chat.** A Edge Function usa a chave `anon` + o JWT do
  usuário logado — toda consulta/alteração passa pela RLS de cada tabela,
  igual a uma chamada comum da REST API. Nada roda com privilégio elevado.
- **Leitura (`consultar_dados`):** só `SELECT`/`WITH ... SELECT`, whitelist de
  tabelas pedagógicas, bloqueio de DDL/comentários/múltiplas instruções/schemas
  sensíveis (`auth.`, `storage.`, `pg_catalog.` etc.), limite de 200 linhas e
  timeout de 5s. Validado dentro do Postgres (`_sacp_chat_validar`), não só na
  Edge Function.
- **Escrita (`propor_alteracao`):** só coordenação pode propor (verificado com
  `sacp_is_coordenador()`); `UPDATE`/`DELETE` sem `WHERE` são recusados; a
  alteração fica **pendente** até o usuário clicar em "Confirmar e executar" na
  tela — o clique chama `sacp_chat_confirmar_escrita`, que revalida a SQL e só
  então executa. Propostas expiram em 10 minutos.
- **Auditoria (LGPD):** toda consulta (leitura ou escrita, sucesso ou erro) é
  registrada em `chat_ia_execucoes` com usuário, SQL e resultado.
- **Acesso à tela:** só coordenação vê "Chat IA" na navegação; professores são
  redirecionados para o dashboard se tentarem acessar a rota diretamente
  (mesmo guard de `isViewAllowedForRole` usado pelo resto do app).

## 4. Limitação conhecida (não introduzida por este recurso)

Algumas tabelas (`professores`, `entregas_docentes`, `registros_coordenacao`,
`notas`, `relatorio_avaliacao_pre`, `alunos_turmas_especiais`,
`diario_frequencia_especial`, `livros_biblioteca`, `emprestimos_biblioteca`)
ainda têm, além das policies por papel, policies antigas `USING (true)` do
endurecimento inicial (`supabase_piloto_seguranca.sql`) que liberam
`INSERT/UPDATE/DELETE` para **qualquer** usuário autenticado nessas tabelas —
não só coordenação. Isso é anterior ao Chat IA (apareceu no advisor de
segurança do Supabase ao rodar a migration) e vale tanto para a REST API
comum quanto para o chat. Recomendo revisar e remover essas policies
`sacp_auth_insert/update/delete` antigas nessas tabelas específicas quando for
users, para completar o modelo de papéis já aplicado em `escolas`, `turmas`,
`alunos`, `sondagens`, `ocorrencias`, `notas_boletim`, `agenda_eventos`.

## 5. Testando

1. Configure o secret (passo 2).
2. Login como coordenação → menu lateral → "Chat IA".
3. Pergunte algo de leitura, ex.: *"Quantos alunos estão com etiqueta vermelha?"*
4. Peça uma alteração, ex.: *"Atualize a etiqueta do aluno João Silva para amarelo"*
   → o chat deve responder com um cartão amarelo de confirmação (SQL visível)
   em vez de executar direto. Confirme e veja o resultado.
5. Confira o log: `select * from chat_ia_execucoes order by criado_em desc limit 20;`
   no SQL Editor do Supabase.

## 6. Ajustar a whitelist de tabelas ou o prompt

- Whitelist de tabelas: array `v_whitelist` dentro de
  `_sacp_chat_validar` em `supabase_chat_ia.sql` (rode o arquivo de novo, ou
  aplique só o `CREATE OR REPLACE FUNCTION` dessa função, para atualizar).
- Schema/instruções que a IA recebe: `SCHEMA_DOC` e `buildSystemPrompt` em
  `supabase/functions/chat-ia/index.ts` (precisa `supabase functions deploy chat-ia`
  depois de editar).
