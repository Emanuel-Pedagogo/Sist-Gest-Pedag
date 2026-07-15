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
  const textoAnos = anos.map((a) => String(a).toLowerCase()).join(' ');
  // Ensino médio usa os mesmos descritores do Fundamental II
  if (
    /\bensino\s*m[eé]dio\b/.test(nome) ||
    /\b[1-3][º°o]?\s*ano\s*(?:em|e\.?\s*m\.?)\b/.test(nome) ||
    /\b[1-3][º°o]?\s*(?:ano\s*)?(?:do\s*)?m[eé]dio\b/.test(nome) ||
    /\bensino\s*m[eé]dio\b/.test(textoAnos) ||
    /\b[1-3][º°o]?\s*ano\s*(?:em|e\.?\s*m\.?)\b/.test(textoAnos) ||
    /\b[1-3][º°o]?\s*(?:ano\s*)?(?:do\s*)?m[eé]dio\b/.test(textoAnos)
  ) {
    return '6-9';
  }
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

export function normalizeNivelKey(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[–—-]/g, ' ')
    .trim();
}

/** Grupos para configuração de tags (descritores por etapa). */
export const GRUPOS_NIVEIS_LEITURA = [
  { id: '1-2', label: 'Pré I, Pré II, 1º e 2º ano', opcoes: NIVEL_LEITURA_OPCOES_1_2 },
  { id: '3-5', label: '3º ao 5º ano', opcoes: NIVEL_LEITURA_OPCOES_3_5 },
  { id: '6-9', label: '6º ao 9º ano', opcoes: NIVEL_LEITURA_OPCOES_FUNDAMENTAL2 },
];

export const GRUPOS_NIVEIS_ESCRITA = [
  { id: '1-2', label: 'Pré I, Pré II, 1º e 2º ano', opcoes: NIVEL_ESCRITA_OPCOES_1_2 },
  { id: '3-5', label: '3º ao 5º ano', opcoes: NIVEL_ESCRITA_OPCOES_3_5 },
  { id: '6-9', label: '6º ao 9º ano', opcoes: NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2 },
];

export const TODOS_NIVEIS_LEITURA = [
  ...NIVEL_LEITURA_OPCOES_1_2,
  ...NIVEL_LEITURA_OPCOES_3_5,
  ...NIVEL_LEITURA_OPCOES_FUNDAMENTAL2,
];

export const TODOS_NIVEIS_ESCRITA = [
  ...NIVEL_ESCRITA_OPCOES_1_2,
  ...NIVEL_ESCRITA_OPCOES_3_5,
  ...NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2,
];

/** Verifica se o valor da sondagem coincide com algum critério salvo (ignora caixa/acentos). */
export function nivelMatchesLista(valor, lista) {
  if (!valor || !lista?.length) return false;
  const key = normalizeNivelKey(valor);
  return lista.some((item) => normalizeNivelKey(item) === key);
}

function normalizeKey(s) {
  return normalizeNivelKey(s);
}

/** Índice do nível na sequência pedagógica oficial (leitura ou escrita). */
export function getNivelOrdemIndex(nome, tipo = 'leitura') {
  const lista = tipo === 'escrita' ? TODOS_NIVEIS_ESCRITA : TODOS_NIVEIS_LEITURA;
  const label = String(nome || '').trim();
  if (!label) return lista.length + 1000;

  const oficial = matchNivelOficial(label, lista);
  if (oficial) {
    return lista.findIndex((o) => normalizeNivelKey(o) === normalizeNivelKey(oficial));
  }

  const key = normalizeNivelKey(label);
  const idx = lista.findIndex((o) => normalizeNivelKey(o) === key);
  return idx >= 0 ? idx : lista.length + 500;
}

/**
 * Ordena linhas { name, value } pela progressão pedagógica (mais alto no topo).
 * Níveis desconhecidos / não informados ficam no final (embaixo no gráfico).
 */
export function sortNiveisPorOrdemPedagogica(rows, tipo = 'leitura') {
  const lista = tipo === 'escrita' ? TODOS_NIVEIS_ESCRITA : TODOS_NIVEIS_LEITURA;

  const isDesconhecido = (name) => getNivelOrdemIndex(name, tipo) >= lista.length;

  return [...(rows || [])].sort((a, b) => {
    const descA = isDesconhecido(a.name);
    const descB = isDesconhecido(b.name);
    if (descA && !descB) return 1;
    if (!descA && descB) return -1;
    const diff = getNivelOrdemIndex(b.name, tipo) - getNivelOrdemIndex(a.name, tipo);
    if (diff !== 0) return diff;
    return String(a.name).localeCompare(String(b.name), 'pt-BR');
  });
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
