import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { callGeminiJson } from '../_shared/gemini.ts';

type ModoBoletim = 'fund1-conceito' | 'fund1-nota' | 'fund2';

function buildPrompt(modo: ModoBoletim, disciplinas: string[]) {
  const listaDisc = disciplinas.map((d) => `- "${d}"`).join('\n');

  const colunasFund2 = `
Cabeçalho típico (Fundamental II — 6º ao 9º): "NT FA NT FA RS1 NT FA NT FA RS2 MD TF"
Para CADA disciplina, na mesma linha após o nome:
- 1º NT = nota do 1º bimestre (número com vírgula, ex: 6,5)
- FA = faltas da disciplina no 1º bim — IGNORAR
- 2º NT = nota do 2º bimestre
- FA — IGNORAR
- RS1 = recuperação semestral do 1º semestre (pode ser número com vírgula ou 0/vazio)
- 3º NT, FA, 4º NT, FA — idem
- RS2 = recuperação semestral do 2º semestre
- MD = média da disciplina — IGNORAR
- TF — IGNORAR

NÃO confunda RS1/RS2 com notas de bimestre. NÃO use MD nem TF como nota de bimestre.
Se só existem notas do 1º e 2º bimestre, deixe bim3_nt e bim4_nt como null.`;

  const colunasFund1Nota = `
Cabeçalho típico (3º–5º): "NT NT RS1 NT NT RS2 MD" — extraia só NT, RS1 e RS2 (ignore MD).`;

  const colunasConceito = `
Cabeçalho típico (1º ano): "C C C C CF" — use letras N, EP ou S para cada bimestre (bim1 a bim4).`;

  const colunas =
    modo === 'fund2' ? colunasFund2 : modo === 'fund1-conceito' ? colunasConceito : colunasFund1Nota;

  const tipoNota =
    modo === 'fund1-conceito'
      ? `Use strings "N", "EP" ou "S" nos campos bim1_nt … bim4_nt (ou null).`
      : `Use números decimais com PONTO (ex: 6.5) nos campos bim1_nt, bim2_nt, bim3_nt, bim4_nt, rs1, rs2. null se ausente.`;

  return `Você extrai dados de BOLETINS ESCOLARES do sistema EducaMais (Prefeitura de Santarém/SEMED), em PDF com VÁRIOS ALUNOS da mesma turma.

Cada aluno começa com bloco contendo "NOME:" e "MATRÍCULA:" e tabela de "Componentes Curriculares".

${colunas}

FALTAS DO BIMESTRE (obrigatório por aluno):
Abaixo da tabela de disciplinas há seção "Faltas" com linha:
"1º Bim 2º Bim 3º Bim 4º Bim Subtotal Abonadas Total Geral Frequência"
A linha seguinte traz os números: os QUATRO PRIMEIROS são faltas totais de cada bimestre (inteiros).
Extraia faltas_bim1, faltas_bim2, faltas_bim3, faltas_bim4 (use 0 se for zero).

Disciplinas no sistema — use o campo "disciplina" com um destes nomes EXATOS (copie da lista):
${listaDisc}

Regras gerais:
- Liste TODOS os alunos do PDF.
- Não invente alunos nem notas.
- ${tipoNota}
- disciplina: nome exatamente como na lista acima (mapeie "LINGUA PORTUGUESA" etc.).
- matricula: número após "MATRÍCULA:" (só dígitos).
- confianca: "alta" | "media" | "baixa".

Responda SOMENTE JSON válido:
{
  "turma_pdf": "string ou null",
  "alunos": [
    {
      "nome_completo": "string",
      "matricula": "string",
      "disciplinas": [
        {
          "disciplina": "nome exato da lista",
          "bim1_nt": null,
          "bim2_nt": null,
          "bim3_nt": null,
          "bim4_nt": null,
          "rs1": null,
          "rs2": null
        }
      ],
      "faltas_bim1": 0,
      "faltas_bim2": 0,
      "faltas_bim3": 0,
      "faltas_bim4": 0,
      "confianca": "alta"
    }
  ]
}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, mimeType, modoBoletim, disciplinas } = await req.json();
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: 'PDF obrigatório (pdfBase64).' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const modo: ModoBoletim = ['fund1-conceito', 'fund1-nota', 'fund2'].includes(modoBoletim)
      ? modoBoletim
      : 'fund2';
    const disc = Array.isArray(disciplinas) && disciplinas.length > 0
      ? disciplinas
      : [
          'LINGUA PORTUGUESA',
          'HISTÓRIA',
          'GEOGRAFIA',
          'CIÊNCIAS',
          'MATEMÁTICA',
          'ENSINO RELIGIOSO',
          'EDUCAÇÃO FÍSICA',
          'ENSINO DA ARTE',
          'LÍNGUA ESTRANGEIRA - INGLÊS',
          'ESTUDOS AMAZÔNICOS',
        ];

    const parsed = await callGeminiJson([
      { text: buildPrompt(modo, disc) },
      {
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: pdfBase64,
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
