/** Anos/etapas disponíveis no cadastro de turmas. */

export const ANOS_ESCOLARES_OPCOES = [
  'Pré I',
  'Pré II',
  '1º Ano',
  '2º Ano',
  '3º Ano',
  '4º Ano',
  '5º Ano',
  '6º Ano',
  '7º Ano',
  '8º Ano',
  '9º Ano',
  '1º Ano EM',
  '2º Ano EM',
  '3º Ano EM',
];

/** Ordem canônica para filtros de relatório e cruzamento com turmas. */
export const GRADE_ORDER = [
  'Pré I',
  'Pré II',
  '1º',
  '2º',
  '3º',
  '4º',
  '5º',
  '6º',
  '7º',
  '8º',
  '9º',
  '1º EM',
  '2º EM',
  '3º EM',
];

/** Marca explícita de ensino médio (não confundir com a preposição "em"). */
export function isEnsinoMedioText(texto) {
  if (!texto || typeof texto !== 'string') return false;
  const t = texto.trim().toLowerCase();
  return (
    /\bensino\s*m[eé]dio\b/.test(t) ||
    /\bano\s*(?:em|e\.?\s*m\.?)\b/.test(t) ||
    /\b[1-3][\u00ba\u00b0°ºo]?\s*(?:ano\s*)?(?:do\s*)?m[eé]dio\b/.test(t) ||
    /\b(?:em|e\.?\s*m\.?)\s*[1-3]\b/.test(t) ||
    /\b[1-3][\u00ba\u00b0°ºo]?\s*em\b/.test(t)
  );
}

/**
 * Converte rótulo/nome/ano_escolar para série canônica.
 * Ex.: "1º Ano EM" → "1º EM"; "1º Ano" → "1º"
 */
export function toCanonicalGrade(texto) {
  if (texto == null) return null;
  const s = String(texto).trim();
  if (!s) return null;
  const lower = s.toLowerCase();

  if (/^pré\s*i$|^pre\s*i$/i.test(s) || /\b(pré|pre)\s*(i|1)\b/.test(lower)) return 'Pré I';
  if (/^pré\s*ii$|^pre\s*ii$/i.test(s) || /\b(pré|pre)\s*(ii|2)\b/.test(lower)) return 'Pré II';

  // Ensino médio primeiro (nunca cair no fundamental 1º/2º/3º)
  if (isEnsinoMedioText(s)) {
    for (let ano = 1; ano <= 3; ano++) {
      if (new RegExp(`(?<![0-9])${ano}(?![0-9])`).test(lower)) return `${ano}º EM`;
    }
    return null;
  }

  const palavrasAno = [
    ['primeiro', 1],
    ['segundo', 2],
    ['terceiro', 3],
    ['quarto', 4],
    ['quinto', 5],
    ['sexto', 6],
    ['sétimo', 7],
    ['setimo', 7],
    ['oitavo', 8],
    ['nono', 9],
    ['nona', 9],
  ];
  for (const [w, ano] of palavrasAno) {
    if (new RegExp(`\\b${w}\\b(?:\\s*ano)?`, 'i').test(lower)) return `${ano}º`;
  }

  for (let ano = 1; ano <= 9; ano++) {
    if (new RegExp(`\\b(?:serie|seria)\\s*${ano}(?![0-9])\\b`, 'i').test(lower)) return `${ano}º`;
    if (new RegExp(`(?<![0-9])${ano}(?![0-9])\\s*ª(?:\\s*ano)?\\b`, 'i').test(lower)) return `${ano}º`;
    if (
      new RegExp(`(?<![0-9])${ano}(?![0-9])\\s*[\\u00BA\\u00B0°ºo]?\\s*(?:ano)?\\b`, 'iu').test(lower)
    ) {
      return `${ano}º`;
    }
  }
  return null;
}

/** Converte opção do formulário (ex.: "1º Ano EM") para série canônica. */
export function anoOptionToCanonical(anoOption) {
  return toCanonicalGrade(anoOption);
}

/** Séries canônicas da turma (ano_escolar + nome), sem misturar EF com EM. */
export function getCanonicalGradesForTurma(turma) {
  const set = new Set();
  const push = (value) => {
    const g = toCanonicalGrade(value);
    if (g) set.add(g);
  };
  if (turma?.nome) push(turma.nome);
  const raw = turma?.ano_escolar ?? turma?.ano;
  const arr = Array.isArray(raw) ? raw : raw != null && String(raw).trim() !== '' ? [raw] : [];
  for (const item of arr) push(item);

  const grades = [...set];
  // Se há série EM, remove o fundamental correspondente (1º/2º/3º) para não cruzar no picker
  const emYears = grades.filter((g) => String(g).endsWith(' EM')).map((g) => g.replace(' EM', ''));
  if (emYears.length === 0) return grades;
  return grades.filter((g) => !emYears.includes(g));
}
