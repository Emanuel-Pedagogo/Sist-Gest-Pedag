/**
 * Calendário Escolar 2026 — Rede Municipal Urbana/Rural (exceto várzea) — Santarém/PA (SEMED).
 * Marcos para importação inicial; não substitui o PDF oficial.
 */

export const SEMED_CALENDARIO_META = {
  ano: 2026,
  rede: 'Rede Municipal Urbana/Rural (exceto várzea)',
  municipio: 'Santarém',
  uf: 'PA',
  diasLetivos: 200,
  bimestres: [
    { nome: '1º bimestre', meses: 'Fev / Mar / Abr' },
    { nome: '2º bimestre', meses: 'Mai / Jun' },
    { nome: '3º bimestre', meses: 'Ago / Set' },
    { nome: '4º bimestre', meses: 'Out / Nov / Dez' },
  ],
};

/** Cores discretas para não competir com planejamento do usuário */
export const SEMED_CORES = {
  feriado: '#9ca3af',
  recesso: '#94a3b8',
  marco_letivo: '#a78bfa',
  avaliacao: '#86efac',
  recomposicao: '#f0abfc',
  referencia: '#64748b',
};

/**
 * @typedef {'feriado'|'recesso'|'marco_letivo'|'avaliacao'|'recomposicao'|'referencia'} SemedTipo
 * @typedef {{ id: string, tipo: SemedTipo, titulo: string, data_inicio: string, data_fim?: string, observacao?: string, selecionado?: boolean }} SemedItemImport
 */

/** @returns {SemedItemImport[]} */
export function getSemedCalendario2026ItensPadrao() {
  const y = 2026;
  const d = (m, day, fim) => ({
    data_inicio: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    ...(fim != null
      ? { data_fim: `${y}-${String(m).padStart(2, '0')}-${String(fim).padStart(2, '0')}` }
      : {}),
  });

  const items = [
    {
      id: 'ref-calendario',
      tipo: 'referencia',
      titulo: 'Calendário Escolar SEMED 2026 — Santarém',
      ...d(1, 1),
      observacao:
        `${SEMED_CALENDARIO_META.rede}. ${SEMED_CALENDARIO_META.diasLetivos} dias letivos. ` +
        'Consulte o PDF oficial anexo para semanas temáticas e detalhes.',
      selecionado: true,
    },
    {
      id: 'inicio-ano',
      tipo: 'marco_letivo',
      titulo: 'Início do ano letivo 2026',
      ...d(2, 2),
      selecionado: true,
    },
    {
      id: 'fim-ano',
      tipo: 'marco_letivo',
      titulo: 'Encerramento do ano letivo 2026',
      ...d(12, 22),
      selecionado: true,
    },
    {
      id: 'ferias-julho',
      tipo: 'recesso',
      titulo: 'Férias escolares — julho',
      data_inicio: `${y}-07-01`,
      data_fim: `${y}-07-31`,
      selecionado: true,
    },
    {
      id: 'inicio-2sem',
      tipo: 'marco_letivo',
      titulo: 'Início do 2º semestre letivo',
      ...d(8, 3),
      selecionado: true,
    },
    // Feriados (1 dia)
    { id: 'f-01-01', tipo: 'feriado', titulo: 'Confraternização Universal', ...d(1, 1), selecionado: true },
    { id: 'f-02-17', tipo: 'feriado', titulo: 'Carnaval', ...d(2, 17), selecionado: true },
    { id: 'f-02-18', tipo: 'feriado', titulo: 'Quarta-feira de Cinzas', ...d(2, 18), selecionado: true },
    { id: 'f-04-21', tipo: 'feriado', titulo: 'Tiradentes', ...d(4, 21), selecionado: true },
    { id: 'f-05-01', tipo: 'feriado', titulo: 'Dia do Trabalho', ...d(5, 1), selecionado: true },
    { id: 'f-06-04', tipo: 'feriado', titulo: 'Corpus Christi', ...d(6, 4), selecionado: true },
    { id: 'f-08-15', tipo: 'feriado', titulo: 'Adesão do Pará à Independência', ...d(8, 15), selecionado: true },
    { id: 'f-09-07', tipo: 'feriado', titulo: 'Independência do Brasil', ...d(9, 7), selecionado: true },
    { id: 'f-10-12', tipo: 'feriado', titulo: 'Nossa Senhora Aparecida', ...d(10, 12), selecionado: true },
    {
      id: 'f-10-15',
      tipo: 'feriado',
      titulo: 'Dia do Professor (facultativo)',
      ...d(10, 15),
      observacao: 'Facultativo conforme calendário SEMED.',
      selecionado: true,
    },
    { id: 'f-10-28', tipo: 'feriado', titulo: 'Dia do Servidor Público', ...d(10, 28), selecionado: true },
    { id: 'f-11-02', tipo: 'feriado', titulo: 'Finados', ...d(11, 2), selecionado: true },
    { id: 'f-11-15', tipo: 'feriado', titulo: 'Proclamação da República', ...d(11, 15), selecionado: true },
    { id: 'f-11-20', tipo: 'feriado', titulo: 'Consciência Negra', ...d(11, 20), selecionado: true },
    { id: 'f-12-08', tipo: 'feriado', titulo: 'Nossa Senhora da Conceição', ...d(12, 8), selecionado: true },
    { id: 'f-12-25', tipo: 'feriado', titulo: 'Natal', ...d(12, 25), selecionado: true },
    // Marcos pedagógicos (períodos — opcionais no wizard)
    {
      id: 'av-1',
      tipo: 'avaliacao',
      titulo: '1º bim — Semana de avaliação',
      ...d(4, 6, 10),
      selecionado: false,
    },
    {
      id: 'av-2',
      tipo: 'avaliacao',
      titulo: '2º bim — Semana de avaliação',
      ...d(6, 8, 12),
      selecionado: false,
    },
    {
      id: 'av-3',
      tipo: 'avaliacao',
      titulo: '3º bim — Semana de avaliação',
      ...d(9, 21, 25),
      selecionado: false,
    },
    {
      id: 'av-4',
      tipo: 'avaliacao',
      titulo: '4º bim — Semana de avaliação',
      ...d(12, 1, 7),
      selecionado: false,
    },
    {
      id: 'rec-1',
      tipo: 'recomposicao',
      titulo: 'Recomposição da aprendizagem (1º semestre)',
      ...d(6, 23, 29),
      selecionado: false,
    },
    {
      id: 'rec-2',
      tipo: 'recomposicao',
      titulo: 'Recomposição da aprendizagem (2º semestre)',
      ...d(12, 10, 18),
      selecionado: false,
    },
  ];

  return items;
}

export function getSemedTipoLabel(tipo) {
  const map = {
    referencia: 'Referência',
    feriado: 'Feriado',
    recesso: 'Recesso / férias',
    marco_letivo: 'Marco letivo',
    avaliacao: 'Semana de avaliação',
    recomposicao: 'Recomposição da aprendizagem',
  };
  return map[tipo] || tipo;
}

export function getSemedCorPorTipo(tipo) {
  return SEMED_CORES[tipo] || SEMED_CORES.feriado;
}

/** Converte item de importação em payload para agenda_eventos */
export function semedItemToEventPayload(item, { importBatchId, escolaId = null } = {}) {
  const [yi, mi, di] = item.data_inicio.split('-').map(Number);
  const start = new Date(yi, mi - 1, di, 8, 0);
  let end = new Date(yi, mi - 1, di, 9, 0);
  if (item.data_fim) {
    const [yf, mf, df] = item.data_fim.split('-').map(Number);
    end = new Date(yf, mf - 1, df, 18, 0);
  }
  return {
    titulo: item.titulo,
    descricao: item.observacao || `Calendário SEMED ${SEMED_CALENDARIO_META.ano} — ${SEMED_CALENDARIO_META.municipio}/${SEMED_CALENDARIO_META.uf}`,
    data_inicio: start.toISOString(),
    data_fim: end.toISOString(),
    cor_etiqueta: getSemedCorPorTipo(item.tipo),
    turma_id: escolaId,
    nivel_planejamento: null,
    origem: 'sem_ed',
    tipo_marco: item.tipo,
    import_batch_id: importBatchId,
  };
}
