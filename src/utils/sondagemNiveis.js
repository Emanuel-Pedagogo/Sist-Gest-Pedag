/** Conjuntos de níveis de leitura/escrita por etapa (Alfabetiza Pará e anos seguintes). */

export const NIVEL_ESCRITA_OPCOES_1_2 = [
  'PRÉ-SILÁBICO',
  'SILÁBICO SEM VALOR SONORO',
  'SILÁBICO COM VALOR SONORO',
  'SILÁBICO ALFABÉTICO',
  'ALFABÉTICO',
];

export const NIVEL_LEITURA_OPCOES_1_2 = [
  'PRÉ – LEITOR 1',
  'PRÉ – LEITOR 2',
  'PRÉ – LEITOR 3',
  'PRÉ – LEITOR 4',
  'LEITOR INICIANTE',
  'LEITOR FLUENTE',
];

export const NIVEL_ESCRITA_OPCOES_3_5 = [
  'ESCREVE PALAVRAS NÃO ORTOGRÁFICAS',
  'ESCREVE PALAVRAS ORTOGRÁFICAS',
  'ESCREVE FRASES NÃO COESAS',
  'ESCREVE FRASES COESAS',
  'ESCREVE TEXTOS NÃO COESOS',
  'ESCREVE TEXTOS COESOS',
];

export const NIVEL_LEITURA_OPCOES_3_5 = [
  'PRÉ-LEITOR',
  'LEITOR DE PALAVRAS SEM FLUÊNCIA',
  'LEITOR DE PALAVRAS COM FLUÊNCIA',
  'LEITOR DE TEXTO SEM FLUÊNCIA',
  'LEITOR DE TEXTO COM FLUÊNCIA',
  'LEITOR COM FLUÊNCIA, RESPEITA RITMO, INTENSIDADE E ENTONAÇÃO',
];

export const NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2 = [
  'Não Ortográfica',
  'Escreve Palavras Ortográficas',
  'Escreve Frases não Coesas',
  'Não Escreve Textos Coesos',
  'Escreve Textos Coesos',
];

export const NIVEL_LEITURA_OPCOES_FUNDAMENTAL2 = [
  'Pré-Leitor',
  'Leitor de Palavras sem Fluência',
  'Leitor de Palavras com Fluência',
  'Leitor de Frases sem Fluência',
  'Leitor de Frases com Fluência',
  'Leitor de Texto sem Fluência',
  'Leitor de Texto com Fluência',
  'Leitor com Fluência, Respeita Ritmo, Intensidade e Entonação',
];

/** @returns {'1-2' | '3-5' | '6-9'} */
export function inferAnoEscolarSet(turma) {
  if (!turma) return '1-2';
  const nome = (turma.nome || '').toLowerCase();
  const anoEscolar = turma.ano_escolar ?? turma.ano;
  const anos = Array.isArray(anoEscolar) ? anoEscolar : anoEscolar != null ? [anoEscolar] : [];
  const temAno69 = nome.match(/\b[6-9]º?\b/) || anos.some((a) => [6, 7, 8, 9].includes(Number(a)));
  if (temAno69) return '6-9';
  const temAno35 = nome.match(/\b[3-5]º?\b/) || anos.some((a) => [3, 4, 5].includes(Number(a)));
  if (temAno35) return '3-5';
  return '1-2';
}

export function getOpcoesPorAnoSet(anoSet) {
  if (anoSet === '3-5') {
    return { leitura: NIVEL_LEITURA_OPCOES_3_5, escrita: NIVEL_ESCRITA_OPCOES_3_5 };
  }
  if (anoSet === '6-9') {
    return { leitura: NIVEL_LEITURA_OPCOES_FUNDAMENTAL2, escrita: NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2 };
  }
  return { leitura: NIVEL_LEITURA_OPCOES_1_2, escrita: NIVEL_ESCRITA_OPCOES_1_2 };
}

function normalizeKey(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[–—-]/g, ' ')
    .trim();
}

/** Encontra a opção oficial mais próxima ou retorna null. */
export function matchNivelOficial(valor, opcoes) {
  if (!valor || !opcoes?.length) return null;
  const key = normalizeKey(valor);
  const exato = opcoes.find((o) => normalizeKey(o) === key);
  if (exato) return exato;
  const parcial = opcoes.find((o) => {
    const k = normalizeKey(o);
    return key.includes(k) || k.includes(key);
  });
  return parcial || null;
}

export function buildNiveisPromptBlock(anoSet) {
  const { leitura, escrita } = getOpcoesPorAnoSet(anoSet);
  return `Ano escolar inferido: ${anoSet}
Níveis de LEITURA (use exatamente um destes textos em nivel_leitura):
${leitura.map((n) => `- ${n}`).join('\n')}

Níveis de ESCRITA (use exatamente um destes textos em nivel_escrita):
${escrita.map((n) => `- ${n}`).join('\n')}`;
}
