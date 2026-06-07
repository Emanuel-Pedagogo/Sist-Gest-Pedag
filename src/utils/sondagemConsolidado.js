/** Retorna chave YYYY-MM para um Date (padrão: hoje). */
export function formatMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Verifica se data (YYYY-MM-DD ou ISO) pertence ao mês YYYY-MM. */
export function isDateInMonth(dateStr, monthKey) {
  if (!dateStr || !monthKey) return false;
  return String(dateStr).slice(0, 7) === monthKey;
}

/**
 * Para cada aluno, retorna a sondagem mais recente dentro do mês informado.
 * @param {Array<{ aluno_id: string, data: string, nivel_leitura?: string, nivel_escrita?: string }>} sondagens
 */
export function pickLatestSondagemPerAlunoInMonth(sondagens, monthKey) {
  if (!monthKey || !sondagens?.length) return [];

  const filtered = sondagens.filter((s) => isDateInMonth(s.data, monthKey));
  const sorted = [...filtered].sort((a, b) => String(b.data).localeCompare(String(a.data)));

  const byAluno = new Map();
  for (const s of sorted) {
    if (s.aluno_id && !byAluno.has(s.aluno_id)) {
      byAluno.set(s.aluno_id, s);
    }
  }
  return Array.from(byAluno.values());
}

/** Conta registros por campo de nível (leitura ou escrita). */
export function countByNivel(records, field, fallback = 'Não informado') {
  const counts = {};
  for (const s of records || []) {
    const nivel = String(s[field] || '').trim() || fallback;
    counts[nivel] = (counts[nivel] || 0) + 1;
  }
  return Object.keys(counts)
    .map((name) => ({ name, value: counts[name] }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Consolida sondagens da turma para um mês de referência.
 * @param {number} totalAlunos — tamanho da turma (para calcular sem sondagem)
 */
export function consolidateSondagensMes(sondagens, monthKey, totalAlunos = 0) {
  const latest = pickLatestSondagemPerAlunoInMonth(sondagens, monthKey);
  const comSondagem = latest.length;
  const semSondagem = Math.max(0, totalAlunos - comSondagem);

  return {
    monthKey,
    latest,
    comSondagem,
    semSondagem,
    leituraData: countByNivel(latest, 'nivel_leitura'),
    escritaData: countByNivel(latest, 'nivel_escrita'),
    hasSondagens: comSondagem > 0,
  };
}
