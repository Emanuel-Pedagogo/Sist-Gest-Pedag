import { consolidateSondagensMes, formatMonthKey } from './sondagemConsolidado';
import {
  ETIQUETA_ORDER,
  ETIQUETA_LABELS,
  ETIQUETA_COLORS,
} from './etiquetas';

export { ETIQUETA_ORDER, ETIQUETA_LABELS, ETIQUETA_COLORS };

export const OCORRENCIA_TIPOS_PADRAO = [
  'Pedagógico',
  'Comportamental',
  'Família',
  'Saúde',
  'Outros',
];

export const FREQ_FAIXAS = [
  { id: 'adequada', label: 'Adequada (≥85%)', min: 85 },
  { id: 'atencao', label: 'Atenção (75–84%)', min: 75, max: 84.99 },
  { id: 'risco', label: 'Risco (<75%)', max: 74.99 },
];

export const DEFAULT_MEDIA_MINIMA = 6;

/** Verifica se aluno possui indicador confiável de AEE. */
export function alunoTemAee(aluno) {
  if (!aluno) return false;
  if (aluno.etiqueta_cor === 'roxo') return true;
  if (aluno.aee_tem_laudo) return true;
  if (String(aluno.aee_deficiencia || '').trim()) return true;
  return false;
}

/**
 * Filtra alunos conforme critérios globais dos gráficos.
 * @param {Array} students
 * @param {{ turmaId?: string, etiquetaCor?: string, aeeFilter?: 'all'|'com_aee'|'sem_aee' }} filters
 */
export function filterStudents(students, filters = {}) {
  const list = students || [];
  const { turmaId, etiquetaCor, aeeFilter = 'all' } = filters;

  return list.filter((a) => {
    if (turmaId && String(a.turma_id) !== String(turmaId)) return false;
    if (etiquetaCor && (a.etiqueta_cor || 'azul') !== etiquetaCor) return false;
    const temAee = alunoTemAee(a);
    if (aeeFilter === 'com_aee' && !temAee) return false;
    if (aeeFilter === 'sem_aee' && temAee) return false;
    return true;
  });
}

/** Calcula percentual seguro (0 quando total é 0). */
export function calcPercent(value, total) {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

/**
 * Enriquece dados de gráfico com percentual conforme modo de exibição.
 * @param {'count'|'percent'|'both'} mode
 */
export function enrichWithValueMode(rows, total, mode = 'both') {
  return (rows || []).map((row) => {
    const value = row.value ?? row.total ?? 0;
    const percent = calcPercent(value, total);
    const base = { ...row, value, percent };
    if (mode === 'count') return { ...base, label: String(value) };
    if (mode === 'percent') return { ...base, label: `${percent}%` };
    return { ...base, label: `${value} (${percent}%)` };
  });
}

/** Agrupa alunos por etiqueta pedagógica. */
export function countByEtiqueta(students, { includeEmpty = false } = {}) {
  const counts = {};
  for (const cor of ETIQUETA_ORDER) counts[cor] = 0;

  for (const a of students || []) {
    const cor = a.etiqueta_cor || 'azul';
    if (counts[cor] !== undefined) counts[cor] += 1;
    else if (includeEmpty) counts[cor] = (counts[cor] || 0) + 1;
  }

  return ETIQUETA_ORDER
    .filter((cor) => includeEmpty || counts[cor] > 0)
    .map((cor) => ({
      cor,
      name: ETIQUETA_LABELS[cor] || cor,
      value: counts[cor],
      fill: ETIQUETA_COLORS[cor],
    }));
}

/** Distribuição de etiquetas por turma (para barras agrupadas). */
export function countEtiquetasByTurma(students) {
  const byTurma = {};

  for (const a of students || []) {
    const turma = a.turma_nome || '-';
    const cor = a.etiqueta_cor || 'azul';
    if (!byTurma[turma]) {
      byTurma[turma] = { turma };
      for (const c of ETIQUETA_ORDER) byTurma[turma][c] = 0;
    }
    if (byTurma[turma][cor] !== undefined) byTurma[turma][cor] += 1;
  }

  return Object.values(byTurma).sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR'));
}

/** Consolida sondagens do período (mês) para conjunto de alunos. */
export function buildSondagemConsolidado(sondagens, students, monthKey) {
  const total = students?.length || 0;
  const consolidado = consolidateSondagensMes(sondagens, monthKey, total);
  const alunoIdsComSondagem = new Set(consolidado.latest.map((s) => s.aluno_id));
  const semSondagemAlunos = (students || []).filter((a) => !alunoIdsComSondagem.has(a.id));

  return {
    ...consolidado,
    semSondagemAlunos,
    semSondagemNomes: semSondagemAlunos.map((a) => a.nome).filter(Boolean),
  };
}

/** Verifica se data YYYY-MM-DD está no mês YYYY-MM. */
export function isOcorrenciaInMonth(dateStr, monthKey) {
  if (!dateStr || !monthKey) return true;
  return String(dateStr).slice(0, 7) === monthKey;
}

/** Filtra ocorrências por período e tipo. */
export function filterOcorrencias(ocorrencias, { monthKey, tipo, alunoIds } = {}) {
  const ids = alunoIds ? new Set(alunoIds) : null;

  return (ocorrencias || []).filter((o) => {
    if (ids && !ids.has(o.aluno_id)) return false;
    if (tipo && o.tipo !== tipo) return false;
    if (monthKey && !isOcorrenciaInMonth(o.data_ocorrencia, monthKey)) return false;
    return true;
  });
}

/** Conta ocorrências por tipo. */
export function countOcorrenciasPorTipo(ocorrencias, filters = {}) {
  const filtered = filterOcorrencias(ocorrencias, filters);
  const counts = {};

  for (const o of filtered) {
    const tipo = String(o.tipo || 'Outros').trim() || 'Outros';
    counts[tipo] = (counts[tipo] || 0) + 1;
  }

  const tipos = [...new Set([...OCORRENCIA_TIPOS_PADRAO, ...Object.keys(counts)])];

  return tipos
    .map((tipo) => ({ name: tipo, value: counts[tipo] || 0 }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Agrupa ocorrências por mês (YYYY-MM). */
export function countOcorrenciasPorMes(ocorrencias, filters = {}) {
  const filtered = filterOcorrencias(ocorrencias, filters);
  const counts = {};

  for (const o of filtered) {
    const mes = String(o.data_ocorrencia || '').slice(0, 7);
    if (!mes || mes.length < 7) continue;
    counts[mes] = (counts[mes] || 0) + 1;
  }

  return Object.keys(counts)
    .sort()
    .map((mes) => ({
      mes,
      label: formatMonthLabel(mes),
      value: counts[mes],
    }));
}

export function formatMonthLabel(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

/** Converte nota para número ou null. */
export function parseNota(nota) {
  if (nota === null || nota === undefined || nota === '') return null;
  const val = parseFloat(String(nota).replace(',', '.'));
  return Number.isNaN(val) ? null : val;
}

/** Média de notas por disciplina (turma filtrada). */
export function aggregateNotasPorDisciplina(notas, { bimestre, disciplina, alunoIds } = {}) {
  const ids = alunoIds ? new Set(alunoIds) : null;
  const sums = {};
  const counts = {};

  for (const n of notas || []) {
    if (ids && !ids.has(n.aluno_id)) continue;
    if (bimestre && String(n.bimestre) !== String(bimestre)) continue;
    if (disciplina && n.disciplina !== disciplina) continue;
    const val = parseNota(n.nota);
    if (val === null) continue;
    const disc = n.disciplina || 'Sem disciplina';
    sums[disc] = (sums[disc] || 0) + val;
    counts[disc] = (counts[disc] || 0) + 1;
  }

  return Object.keys(sums)
    .map((disc) => ({
      name: disc,
      value: Math.round((sums[disc] / counts[disc]) * 100) / 100,
      total: counts[disc],
    }))
    .sort((a, b) => a.value - b.value);
}

/**
 * Alunos com média abaixo do parâmetro (por disciplina/bimestre).
 * Retorna lista resumida para tabela/card.
 */
export function getAlunosAbaixoMedia(notas, students, {
  threshold = DEFAULT_MEDIA_MINIMA,
  bimestre,
  disciplina,
} = {}) {
  const byAluno = {};
  const studentMap = Object.fromEntries((students || []).map((s) => [s.id, s]));

  for (const n of notas || []) {
    if (bimestre && String(n.bimestre) !== String(bimestre)) continue;
    if (disciplina && n.disciplina !== disciplina) continue;
    const val = parseNota(n.nota);
    if (val === null) continue;
    if (!byAluno[n.aluno_id]) byAluno[n.aluno_id] = { soma: 0, qtd: 0 };
    byAluno[n.aluno_id].soma += val;
    byAluno[n.aluno_id].qtd += 1;
  }

  const result = [];
  for (const [alunoId, agg] of Object.entries(byAluno)) {
    const media = agg.soma / agg.qtd;
    if (media < threshold) {
      const aluno = studentMap[alunoId];
      result.push({
        alunoId,
        nome: aluno?.nome || 'Aluno',
        turma: aluno?.turma_nome || '-',
        media: Math.round(media * 100) / 100,
      });
    }
  }

  return result.sort((a, b) => a.media - b.media);
}

/** Nome do mês (ex.: "jun") a partir de YYYY-MM para cruzar com mes_referencia textual. */
function monthKeyToShortName(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return '';
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }).slice(0, 3).toLowerCase();
}

/** Classifica alunos em faixas de frequência. */
export function countFrequenciaPorFaixa(students, frequenciaHistorico, { monthKey, reportYear } = {}) {
  const faixas = { adequada: 0, atencao: 0, risco: 0, sem_dado: 0 };
  const mesCurto = monthKeyToShortName(monthKey);

  const histByAluno = {};
  for (const h of frequenciaHistorico || []) {
    if (reportYear && Number(h.ano) !== Number(reportYear)) continue;
    if (mesCurto) {
      const ref = String(h.mes_referencia || '').toLowerCase();
      if (!ref.includes(mesCurto)) continue;
    }
    if (!histByAluno[h.aluno_id] || Number(h.ano) >= Number(histByAluno[h.aluno_id].ano)) {
      histByAluno[h.aluno_id] = h;
    }
  }

  for (const a of students || []) {
    let pct = null;
    if (histByAluno[a.id]) {
      pct = parseFloat(histByAluno[a.id].porcentagem);
    } else if (!mesCurto && a.frequencia != null && a.frequencia !== '') {
      pct = parseFloat(a.frequencia);
    }

    if (pct === null || Number.isNaN(pct)) {
      faixas.sem_dado += 1;
    } else if (pct >= 85) {
      faixas.adequada += 1;
    } else if (pct >= 75) {
      faixas.atencao += 1;
    } else {
      faixas.risco += 1;
    }
  }

  return FREQ_FAIXAS.map((f) => ({
    id: f.id,
    name: f.label,
    value: faixas[f.id] || 0,
  })).concat(
    faixas.sem_dado > 0
      ? [{ id: 'sem_dado', name: 'Sem dado', value: faixas.sem_dado }]
      : []
  );
}

/** Contagem agregada de alunos AEE (sem dados sensíveis). */
export function countAeeAgregado(students) {
  const comAee = (students || []).filter(alunoTemAee).length;
  const total = students?.length || 0;
  return {
    comAee,
    semAee: Math.max(0, total - comAee),
    total,
  };
}

/** Rótulo do período analisado para exibição nos filtros. */
export function buildPeriodSummary({ reportYear, monthKey, turmaNome, escolaNome }) {
  const parts = [];
  if (escolaNome) parts.push(escolaNome);
  parts.push(`Ano letivo ${reportYear}`);
  if (monthKey) parts.push(formatMonthLabel(monthKey));
  if (turmaNome) parts.push(`Turma ${turmaNome}`);
  return parts.join(' · ');
}

/** Chave padrão do mês atual. */
export function getDefaultMonthKey() {
  return formatMonthKey();
}

/** Prepara estrutura para exportação futura de gráficos. */
export function chartExportMeta(chartId, title, data) {
  return {
    chartId,
    title,
    exportedAt: new Date().toISOString(),
    rowCount: Array.isArray(data) ? data.length : 0,
    data,
  };
}
