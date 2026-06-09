const ETIQUETA_META = {
  azul: { label: 'Adequado', color: '#3498DB' },
  verde: { label: 'Avançado', color: '#2ECC71' },
  amarelo: { label: 'Atenção', color: '#F1C40F' },
  vermelho: { label: 'Risco', color: '#E74C3C' },
  roxo: { label: 'AEE', color: '#9B59B6' },
};

export const ETIQUETA_ORDER = ['azul', 'verde', 'amarelo', 'vermelho', 'roxo'];

export function formatMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getMonthLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  if (!year || !month) return 'Período não informado';
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

export function isDateInMonth(dateStr, monthKey) {
  if (!dateStr || !monthKey) return false;
  return String(dateStr).slice(0, 7) === monthKey;
}

export function numericValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function hasAeeData(aluno) {
  if (!aluno) return false;
  if (aluno.etiqueta_cor === 'roxo') return true;
  return Object.entries(aluno).some(([key, value]) => {
    if (!key.startsWith('aee_')) return false;
    if (typeof value === 'boolean') return value;
    return value !== null && value !== undefined && String(value).trim() !== '';
  });
}

export function scopeTurmas(turmas, { schoolId = '', year = '' } = {}) {
  const schoolScoped = (turmas || []).filter((turma) => {
    if (!schoolId) return true;
    return String(turma.escola_id || '') === String(schoolId);
  });

  if (!year) return { turmas: schoolScoped, yearFallback: false };

  const withMatchingYear = schoolScoped.filter((turma) => String(turma.ano_letivo || '') === String(year));
  if (withMatchingYear.length > 0) {
    return { turmas: withMatchingYear, yearFallback: false };
  }

  return { turmas: schoolScoped, yearFallback: schoolScoped.length > 0 };
}

export function attachTurmaInfo(alunos, turmas) {
  const turmaById = new Map((turmas || []).map((turma) => [String(turma.id), turma]));
  return (alunos || [])
    .map((aluno) => {
      const turma = turmaById.get(String(aluno.turma_id));
      if (!turma) return null;
      return {
        ...aluno,
        turma_nome: turma.nome || 'Turma sem nome',
        escola_id: turma.escola_id || null,
        ano_letivo: turma.ano_letivo || null,
      };
    })
    .filter(Boolean);
}

export function filterAlunosForCharts(alunos, filters = {}) {
  return (alunos || []).filter((aluno) => {
    if (filters.turmaId && String(aluno.turma_id) !== String(filters.turmaId)) return false;
    if (filters.etiqueta && String(aluno.etiqueta_cor || '') !== String(filters.etiqueta)) return false;
    if (filters.aee === 'com' && !hasAeeData(aluno)) return false;
    if (filters.aee === 'sem' && hasAeeData(aluno)) return false;
    return true;
  });
}

export function latestSondagensForMonth(sondagens, alunoIds, monthKey) {
  const allowed = new Set((alunoIds || []).map(String));
  const filtered = (sondagens || [])
    .filter((sondagem) => allowed.has(String(sondagem.aluno_id)))
    .filter((sondagem) => isDateInMonth(sondagem.data, monthKey))
    .sort((a, b) => {
      const dateCmp = String(b.data || '').localeCompare(String(a.data || ''));
      if (dateCmp !== 0) return dateCmp;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });

  const byAluno = new Map();
  for (const sondagem of filtered) {
    const key = String(sondagem.aluno_id);
    if (!byAluno.has(key)) byAluno.set(key, sondagem);
  }
  return Array.from(byAluno.values());
}

export function countByField(rows, field, fallback = 'Não informado') {
  const counts = new Map();
  for (const row of rows || []) {
    const label = String(row[field] || '').trim() || fallback;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'));
}

export function aggregateEtiquetas(alunos) {
  const counts = new Map(ETIQUETA_ORDER.map((cor) => [cor, 0]));
  for (const aluno of alunos || []) {
    const cor = ETIQUETA_META[aluno.etiqueta_cor] ? aluno.etiqueta_cor : 'azul';
    counts.set(cor, (counts.get(cor) || 0) + 1);
  }
  return ETIQUETA_ORDER.map((cor) => ({
    cor,
    name: ETIQUETA_META[cor].label,
    total: counts.get(cor) || 0,
    color: ETIQUETA_META[cor].color,
  })).filter((item) => item.total > 0);
}

export function aggregateEtiquetasPorTurma(alunos) {
  const byTurma = new Map();
  for (const aluno of alunos || []) {
    const turma = aluno.turma_nome || 'Turma sem nome';
    if (!byTurma.has(turma)) {
      byTurma.set(turma, {
        turma,
        azul: 0,
        verde: 0,
        amarelo: 0,
        vermelho: 0,
        roxo: 0,
      });
    }
    const row = byTurma.get(turma);
    const cor = ETIQUETA_META[aluno.etiqueta_cor] ? aluno.etiqueta_cor : 'azul';
    row[cor] += 1;
  }
  return Array.from(byTurma.values()).sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR'));
}

export function studentsWithoutSondagem(alunos, latestSondagens) {
  const withSondagem = new Set((latestSondagens || []).map((s) => String(s.aluno_id)));
  return (alunos || [])
    .filter((aluno) => !withSondagem.has(String(aluno.id)))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
}

export function buildSondagemComparison(leituraData, escritaData) {
  const labels = new Set([
    ...(leituraData || []).map((item) => item.name),
    ...(escritaData || []).map((item) => item.name),
  ]);
  const leituraByName = new Map((leituraData || []).map((item) => [item.name, item.total]));
  const escritaByName = new Map((escritaData || []).map((item) => [item.name, item.total]));
  return Array.from(labels)
    .map((name) => ({
      name,
      leitura: leituraByName.get(name) || 0,
      escrita: escritaByName.get(name) || 0,
    }))
    .sort((a, b) => (b.leitura + b.escrita) - (a.leitura + a.escrita));
}

function rowDate(row) {
  return row.data_ocorrencia || row.data || row.created_at || '';
}

export function filterRowsByAlunoAndMonth(rows, alunoIds, monthKey, dateGetter = rowDate) {
  const allowed = new Set((alunoIds || []).map(String));
  return (rows || [])
    .filter((row) => allowed.has(String(row.aluno_id)))
    .filter((row) => !monthKey || isDateInMonth(dateGetter(row), monthKey));
}

export function aggregateOcorrenciasPorTipo(ocorrencias, tipo = '') {
  const rows = tipo ? (ocorrencias || []).filter((o) => o.tipo === tipo) : ocorrencias || [];
  return countByField(rows, 'tipo', 'Sem tipo');
}

export function aggregateOcorrenciasPorMes(ocorrencias) {
  const counts = new Map();
  for (const ocorrencia of ocorrencias || []) {
    const key = String(rowDate(ocorrencia)).slice(0, 7);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}

export function filterNotas(notas, alunoIds, { bimestre = '', disciplina = '' } = {}) {
  const allowed = new Set((alunoIds || []).map(String));
  return (notas || []).filter((nota) => {
    if (!allowed.has(String(nota.aluno_id))) return false;
    if (bimestre && String(nota.bimestre) !== String(bimestre)) return false;
    if (disciplina && String(nota.disciplina || '') !== String(disciplina)) return false;
    return numericValue(nota.nota) !== null;
  });
}

export function aggregateNotasPorDisciplina(notas) {
  const grouped = new Map();
  for (const nota of notas || []) {
    const disciplina = nota.disciplina || 'Sem disciplina';
    const valor = numericValue(nota.nota);
    if (valor === null) continue;
    const row = grouped.get(disciplina) || { disciplina, soma: 0, totalNotas: 0 };
    row.soma += valor;
    row.totalNotas += 1;
    grouped.set(disciplina, row);
  }
  return Array.from(grouped.values())
    .map((row) => ({
      disciplina: row.disciplina,
      media: Number((row.soma / row.totalNotas).toFixed(1)),
      totalNotas: row.totalNotas,
    }))
    .sort((a, b) => a.media - b.media || a.disciplina.localeCompare(b.disciplina, 'pt-BR'));
}

export function alunosAbaixoMedia(notas, threshold = 5) {
  const alunos = new Set();
  for (const nota of notas || []) {
    const valor = numericValue(nota.nota);
    if (valor !== null && valor < threshold) alunos.add(String(nota.aluno_id));
  }
  return alunos.size;
}

function monthMatchesFrequency(row, monthKey) {
  if (!monthKey) return true;
  const [, month] = monthKey.split('-');
  const mes = String(row.mes_referencia || '').trim().toLowerCase();
  if (!mes) return false;
  const monthNumber = String(Number(month));
  const monthPadded = month;
  const nomes = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const nome = nomes[Number(month) - 1];
  return mes === monthNumber || mes === monthPadded || mes.includes(nome);
}

export function aggregateFrequencia(frequencias, alunoIds, monthKey) {
  const allowed = new Set((alunoIds || []).map(String));
  const latest = new Map();
  for (const row of frequencias || []) {
    if (!allowed.has(String(row.aluno_id))) continue;
    if (!monthMatchesFrequency(row, monthKey)) continue;
    const key = String(row.aluno_id);
    const current = latest.get(key);
    if (!current || String(row.created_at || '').localeCompare(String(current.created_at || '')) > 0) {
      latest.set(key, row);
    }
  }

  const buckets = [
    { name: 'Adequada (>= 85%)', total: 0 },
    { name: 'Atenção (75% a 84%)', total: 0 },
    { name: 'Risco (< 75%)', total: 0 },
  ];

  latest.forEach((row) => {
    const pct = numericValue(row.porcentagem);
    if (pct === null) return;
    if (pct >= 85) buckets[0].total += 1;
    else if (pct >= 75) buckets[1].total += 1;
    else buckets[2].total += 1;
  });

  return buckets.filter((bucket) => bucket.total > 0);
}

export function aggregateAee(alunos) {
  const comAee = (alunos || []).filter(hasAeeData).length;
  const semAee = Math.max(0, (alunos || []).length - comAee);
  return [
    { name: 'Com AEE', total: comAee, color: ETIQUETA_META.roxo.color },
    { name: 'Sem AEE', total: semAee, color: '#94A3B8' },
  ].filter((item) => item.total > 0);
}

export function withPercent(data, total) {
  return (data || []).map((item) => ({
    ...item,
    percent: total > 0 ? Number(((item.total / total) * 100).toFixed(1)) : 0,
  }));
}

export function uniqueSorted(values) {
  return Array.from(new Set((values || []).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), 'pt-BR')
  );
}
