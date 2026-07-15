import { isEnsinoMedioText } from './anosEscolares';

/** Disciplinas do 1º ao 5º ano (Fundamental I). */
export const DISCIPLINAS_ATE_5_ANO = [
  'LINGUA PORTUGUESA',
  'ENSINO DA HISTÓRIA E GEOGRAFIA',
  'CIÊNCIAS',
  'MATEMÁTICA',
  'ENSINO RELIGIOSO',
  'EDUCAÇÃO FÍSICA',
  'ENSINO DA ARTE',
];

/** Disciplinas do 6º ao 9º ano (Fundamental II) e Ensino Médio (mesmo conjunto base). */
export const DISCIPLINAS_6_AO_9_ANO = [
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

export const CONCEITO_TO_NUM = { N: 1, EP: 2, S: 3 };
export const FALTAS_BIMESTRE_KEY = 'Faltas do Bimestre';

/** Mapeia rótulo do EducaMais → nome exato no banco. */
export const DISCIPLINA_EDUCAMAIS_PARA_SISTEMA = {
  'LINGUA PORTUGUESA': 'LINGUA PORTUGUESA',
  'LÍNGUA PORTUGUESA': 'LINGUA PORTUGUESA',
  'ENSINO DA HISTÓRIA E GEOGRAFIA': 'ENSINO DA HISTÓRIA E GEOGRAFIA',
  'HISTÓRIA': 'HISTÓRIA',
  'GEOGRAFIA': 'GEOGRAFIA',
  'CIÊNCIAS': 'CIÊNCIAS',
  'MATEMÁTICA': 'MATEMÁTICA',
  'ENSINO RELIGIOSO': 'ENSINO RELIGIOSO',
  'EDUCAÇÃO FÍSICA': 'EDUCAÇÃO FÍSICA',
  'ENSINO DA ARTE': 'ENSINO DA ARTE',
  'LÍNGUA ESTRANGEIRA - INGLÊS': 'LÍNGUA ESTRANGEIRA - INGLÊS',
  'LÍNGUA ESTRANGEIRA': 'LÍNGUA ESTRANGEIRA - INGLÊS',
  'ESTUDOS AMAZÔNICOS': 'ESTUDOS AMAZÔNICOS',
};

export function isTurmaAteQuintoAno(turmaNome) {
  if (!turmaNome || typeof turmaNome !== 'string') return false;
  if (isEnsinoMedioText(turmaNome)) return false;
  const t = turmaNome.trim();
  return /[1-5]º|[1-5]o|[1-5]°|primeiro|segundo|terceiro|quarto|quinto\s*ano/i.test(t);
}

export function isTurmaPrimeiroAno(turmaNome) {
  if (!turmaNome || typeof turmaNome !== 'string') return false;
  if (isEnsinoMedioText(turmaNome)) return false;
  return /1º|1o|1°|primeiro\s*ano/i.test(turmaNome.trim());
}

export function getDisciplinasPorTurma(turmaNome) {
  return isTurmaAteQuintoAno(turmaNome) ? DISCIPLINAS_ATE_5_ANO : DISCIPLINAS_6_AO_9_ANO;
}

/** fund1-conceito | fund1-nota | fund2 */
export function inferModoBoletim(turmaNome) {
  if (isTurmaPrimeiroAno(turmaNome)) return 'fund1-conceito';
  if (isTurmaAteQuintoAno(turmaNome)) return 'fund1-nota';
  return 'fund2';
}

export function normalizarDisciplinaSistema(nomePdf, turmaNome) {
  const key = String(nomePdf || '').trim().toUpperCase();
  const mapped = DISCIPLINA_EDUCAMAIS_PARA_SISTEMA[key] || DISCIPLINA_EDUCAMAIS_PARA_SISTEMA[nomePdf?.trim()];
  if (mapped) return mapped;
  const lista = getDisciplinasPorTurma(turmaNome);
  const found = lista.find((d) => d.toUpperCase() === key);
  return found || null;
}
