import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { callGeminiJson } from '../_shared/gemini.ts';

const ETIQUETA_LABEL: Record<string, string> = {
  vermelho: 'Prioridade (vermelho)',
  amarelo: 'Atenção (amarelo)',
  verde: 'Avançado (verde)',
  azul: 'Regular (azul)',
  roxo: 'Educação Especial (roxo)',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      alunoNome,
      turmaNome,
      matricula,
      etiquetaCor,
      frequencia,
      nivelLeitura,
      nivelEscrita,
      mediaBoletim,
      disciplinasAbaixo5,
      ocorrenciasResumo,
      historicoSondagens,
    } = body;

    if (!alunoNome) {
      return new Response(JSON.stringify({ error: 'alunoNome é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dadosTexto = `
Aluno: ${alunoNome}
Turma: ${turmaNome || '—'}
Matrícula: ${matricula || '—'}
Etiqueta atual: ${ETIQUETA_LABEL[etiquetaCor] || etiquetaCor || '—'}
Frequência: ${frequencia != null ? `${frequencia}%` : 'não informada'}
Última sondagem — Leitura: ${nivelLeitura || '—'} | Escrita: ${nivelEscrita || '—'}
Média geral no boletim: ${mediaBoletim != null ? mediaBoletim : 'sem notas'}
Disciplinas com nota abaixo de 5: ${disciplinasAbaixo5?.length ? disciplinasAbaixo5.join(', ') : 'nenhuma registrada'}
Ocorrências recentes:
${ocorrenciasResumo?.length ? ocorrenciasResumo.map((o: string) => `- ${o}`).join('\n') : '- nenhuma'}

Histórico de sondagens (mais recentes primeiro):
${historicoSondagens?.length ? historicoSondagens.map((s: string) => `- ${s}`).join('\n') : '- nenhuma'}
`.trim();

    const parsed = await callGeminiJson([
      {
        text: `Você é assistente pedagógico de uma escola pública brasileira.
Com base APENAS nos dados abaixo, escreva um resumo pedagógico objetivo em português do Brasil (3 a 6 parágrafos curtos).
Inclua: situação geral, pontos de atenção, evolução em leitura/escrita se houver histórico, e uma sugestão de encaminhamento para a coordenação (sem diagnosticar deficiências).
Não invente dados que não estejam listados.

DADOS:
${dadosTexto}

Responda SOMENTE JSON: { "resumo": "texto do resumo em markdown simples" }`,
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
