// SACP — Importação de alunos por IA
//
// Dois modos num só endpoint:
//
//   modo: 'extrair'  -> recebe FOTO ou PDF de uma lista de alunos e devolve os
//                       alunos lidos. Usado quando não há estrutura de colunas
//                       para aproveitar (imagem, ou PDF fora do layout conhecido).
//
//   modo: 'mapear'   -> recebe só o cabeçalho + as primeiras linhas de uma
//                       planilha (CSV/Excel) e devolve QUAL COLUNA é cada campo.
//                       O app aplica esse mapeamento em todas as linhas por conta
//                       própria — assim planilha longa não depende da IA copiar
//                       linha por linha (sem risco de pular ou inventar aluno).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { callGeminiJson } from '../_shared/gemini.ts';

const PROMPT_EXTRAIR = `Você extrai LISTAS DE ALUNOS de escolas brasileiras (educação básica).

O arquivo pode ser a foto de uma lista impressa/manuscrita, ou um PDF de sistema escolar.

Liste TODOS os alunos que conseguir identificar, na ordem em que aparecem.

Regras:
1. "nome" é o nome do ALUNO. Nunca use o nome do responsável, da professora ou da escola.
2. "data_nascimento" sempre no formato AAAA-MM-DD. No Brasil as datas vêm como DD/MM/AAAA —
   converta. Ano com 2 dígitos: 00-25 vira 20xx, 26-99 vira 19xx.
3. "matricula" é o número de matrícula/código/coletor do aluno, como texto. Não invente.
4. "responsavel" é o nome do pai/mãe/responsável, quando houver coluna para isso.
5. "contato" é telefone/celular do responsável, quando houver.
6. Campo que não existir no documento ou estiver ilegível: use null. NUNCA invente dado.
7. "revisar": true quando você não tiver certeza do que leu (letra ruim, borrado, cortado).
   Esses são destacados na tela para a pessoa conferir antes de salvar.
8. Ignore cabeçalhos, rodapés, totais e linhas em branco.

Responda SOMENTE com JSON neste formato:
{
  "alunos": [
    {
      "nome": "string",
      "data_nascimento": "AAAA-MM-DD ou null",
      "matricula": "string ou null",
      "responsavel": "string ou null",
      "contato": "string ou null",
      "revisar": false
    }
  ]
}`;

function buildPromptMapear(amostra: string[][]) {
  return `Você identifica colunas de uma PLANILHA DE ALUNOS de escola brasileira.

Abaixo estão as primeiras linhas da planilha (a primeira provavelmente é o cabeçalho).
Cada linha é um array; o índice de cada valor é a posição da coluna (começando em 0).

${JSON.stringify(amostra, null, 2)}

Diga qual ÍNDICE DE COLUNA corresponde a cada campo. Use null quando o campo não existir.

Dicas:
- "nome" é o nome do ALUNO (cabeçalhos comuns: Nome, NOME DO ALUNO, Aluno, Estudante, Discente).
  Se houver uma coluna de nome do aluno e outra do responsável, escolha a do ALUNO.
- "data_nascimento" (Nascimento, Data Nasc, DT NASC, D.N., Data de Nascimento)
- "matricula" (Matrícula, Mat., Código, Coletor, RA, INEP, Nº)
- "responsavel" (Responsável, Filiação, Mãe, Pai, Resp.)
- "contato" (Telefone, Celular, Fone, Contato, WhatsApp)

Se a planilha NÃO tiver linha de cabeçalho, deduza pelo conteúdo (ex.: coluna cheia de
datas é nascimento; coluna com nomes completos é o aluno).

Responda SOMENTE com JSON:
{
  "colunas": {
    "nome": 0,
    "data_nascimento": null,
    "matricula": null,
    "responsavel": null,
    "contato": null
  },
  "tem_cabecalho": true
}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    const body = await req.json();
    const modo = body?.modo === 'mapear' ? 'mapear' : 'extrair';

    // ---- Mapear colunas de planilha ----
    if (modo === 'mapear') {
      const amostra = Array.isArray(body?.amostra) ? body.amostra : [];
      if (amostra.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Amostra da planilha obrigatória (amostra).' }),
          { status: 400, headers: jsonHeaders },
        );
      }
      const parsed = await callGeminiJson([{ text: buildPromptMapear(amostra) }]);
      return new Response(JSON.stringify(parsed), { headers: jsonHeaders });
    }

    // ---- Extrair alunos de foto/PDF ----
    const { arquivoBase64, mimeType } = body || {};
    if (!arquivoBase64) {
      return new Response(
        JSON.stringify({ error: 'Arquivo obrigatório (arquivoBase64).' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const parsed = await callGeminiJson([
      { text: PROMPT_EXTRAIR },
      {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: arquivoBase64,
        },
      },
    ]);

    return new Response(JSON.stringify(parsed), { headers: jsonHeaders });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
