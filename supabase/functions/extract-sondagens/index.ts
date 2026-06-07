import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { callGeminiJson } from '../_shared/gemini.ts';

const NIVEIS: Record<string, { leitura: string[]; escrita: string[] }> = {
  '1-2': {
    leitura: [
      'PRÉ – LEITOR 1',
      'PRÉ – LEITOR 2',
      'PRÉ – LEITOR 3',
      'PRÉ – LEITOR 4',
      'LEITOR INICIANTE',
      'LEITOR FLUENTE',
    ],
    escrita: [
      'PRÉ-SILÁBICO',
      'SILÁBICO SEM VALOR SONORO',
      'SILÁBICO COM VALOR SONORO',
      'SILÁBICO ALFABÉTICO',
      'ALFABÉTICO',
    ],
  },
  '3-5': {
    leitura: [
      'PRÉ-LEITOR',
      'LEITOR DE PALAVRAS SEM FLUÊNCIA',
      'LEITOR DE PALAVRAS COM FLUÊNCIA',
      'LEITOR DE TEXTO SEM FLUÊNCIA',
      'LEITOR DE TEXTO COM FLUÊNCIA',
      'LEITOR COM FLUÊNCIA, RESPEITA RITMO, INTENSIDADE E ENTONAÇÃO',
    ],
    escrita: [
      'ESCREVE PALAVRAS NÃO ORTOGRÁFICAS',
      'ESCREVE PALAVRAS ORTOGRÁFICAS',
      'ESCREVE FRASES NÃO COESAS',
      'ESCREVE FRASES COESAS',
      'ESCREVE TEXTOS NÃO COESOS',
      'ESCREVE TEXTOS COESOS',
    ],
  },
  '6-9': {
    leitura: [
      'Pré-Leitor',
      'Leitor de Palavras sem Fluência',
      'Leitor de Palavras com Fluência',
      'Leitor de Frases sem Fluência',
      'Leitor de Frases com Fluência',
      'Leitor de Texto sem Fluência',
      'Leitor de Texto com Fluência',
      'Leitor com Fluência, Respeita Ritmo, Intensidade e Entonação',
    ],
    escrita: [
      'Não Ortográfica',
      'Escreve Palavras Ortográficas',
      'Escreve Frases não Coesas',
      'Não Escreve Textos Coesos',
      'Escreve Textos Coesos',
    ],
  },
};

function buildPrompt(anoEscolar: string) {
  const n = NIVEIS[anoEscolar] || NIVEIS['1-2'];
  return `Você extrai dados de FICHAS DE SONDAGEM de leitura e escrita (educação básica, Brasil).

Analise a imagem e liste TODOS os alunos visíveis na ficha.

${anoEscolar === '1-2' ? 'Etapa: 1º ou 2º ano (Alfabetiza Pará)' : anoEscolar === '3-5' ? 'Etapa: 3º ao 5º ano' : 'Etapa: 6º ao 9º ano'}

Níveis de LEITURA (use EXATAMENTE um destes em nivel_leitura, ou null se ilegível):
${n.leitura.map((x) => `- ${x}`).join('\n')}

Níveis de ESCRITA (use EXATAMENTE um destes em nivel_escrita, ou null se ilegível):
${n.escrita.map((x) => `- ${x}`).join('\n')}

Regras:
- Não invente alunos ou dados.
- Preserve rigorosamente a ordem visual da ficha, de cima para baixo.
- data_sondagem em AAAA-MM-DD; se só houver dia/mês na ficha, use o ano letivo visível ou null.
- matricula: número do coletor/matrícula se existir, senão null.
- ordem_ficha: inteiro começando em 1, indicando a posição do aluno na ficha original.
- confianca: "alta" | "media" | "baixa".
- duvidas: array de strings (vazio se nenhuma).

Responda SOMENTE JSON válido neste formato:
{
  "escola": "string ou null",
  "data_referencia": "AAAA-MM-DD ou null",
  "registros": [
    {
      "ordem_ficha": 1,
      "nome_completo": "string",
      "matricula": "string ou null",
      "data_sondagem": "AAAA-MM-DD ou null",
      "nivel_leitura": "string ou null",
      "nivel_escrita": "string ou null",
      "observacoes": "string ou null",
      "confianca": "alta",
      "duvidas": []
    }
  ]
}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, anoEscolar } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Imagem obrigatória (imageBase64).' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ano = ['1-2', '3-5', '6-9'].includes(anoEscolar) ? anoEscolar : '1-2';
    const parsed = await callGeminiJson([
      { text: buildPrompt(ano) },
      {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: imageBase64,
        },
      },
    ]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
