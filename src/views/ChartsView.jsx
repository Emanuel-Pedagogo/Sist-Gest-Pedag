import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { supabase } from '../supabaseClient';
import { isTurmaEspecial } from '../utils/turmas';
import SondagemNivelBarChart from '../components/charts/SondagemNivelBarChart';
import {
  ETIQUETA_ORDER,
  ETIQUETA_LABELS,
  ETIQUETA_COLORS,
  OCORRENCIA_TIPOS_PADRAO,
  filterStudents,
  countByEtiqueta,
  countEtiquetasByTurma,
  buildSondagemConsolidado,
  countOcorrenciasPorTipo,
  countOcorrenciasPorMes,
  aggregateNotasPorDisciplina,
  getAlunosAbaixoMedia,
  countFrequenciaPorFaixa,
  countAeeAgregado,
  enrichWithValueMode,
  buildPeriodSummary,
  getDefaultMonthKey,
  chartExportMeta,
  DEFAULT_MEDIA_MINIMA,
} from '../utils/chartsData';


const INITIAL_LOCAL_PREFS = {
  etiquetaChart: 'pie',
  valueMode: 'both',
  showWithoutData: true,
  showSemSondagemNomes: true,
};

function ChartEmpty({ message }) {
  return (
    <p className="chart-empty-msg" role="status">
      {message}
    </p>
  );
}

function ChartSection({ show, showWithoutData, hasData, children }) {
  if (!show) return null;
  if (!hasData && !showWithoutData) return null;
  return children;
}

function ChartTooltip({ active, payload, valueMode }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const value = row.value ?? payload[0]?.value ?? 0;
  const percent = row.percent;
  return (
    <div className="chart-tooltip">
      <strong>{row.name || row.turma || row.nivel || row.mes || payload[0]?.name}</strong>
      <div>
        {valueMode === 'percent' && percent != null ? `${percent}%` : null}
        {valueMode === 'count' ? value : null}
        {valueMode === 'both' ? `${value}${percent != null ? ` (${percent}%)` : ''}` : null}
      </div>
    </div>
  );
}

/** Carrega alunos de turmas regulares e especiais (mesma lógica do restante do app). */
async function fetchAlunosDasTurmas(turmaList) {
  const turmaById = Object.fromEntries(turmaList.map((t) => [t.id, t.nome]));
  const regularIds = turmaList.filter((t) => !isTurmaEspecial(t)).map((t) => t.id);
  const especialIds = turmaList.filter((t) => isTurmaEspecial(t)).map((t) => t.id);
  const byId = new Map();

  if (regularIds.length > 0) {
    const { data, error } = await supabase.from('alunos').select('*').in('turma_id', regularIds);
    if (error) throw error;
    for (const a of data || []) {
      byId.set(a.id, { ...a, turma_nome: turmaById[a.turma_id] || '-' });
    }
  }

  if (especialIds.length > 0) {
    const { data: vinculos, error: vErr } = await supabase
      .from('alunos_turmas_especiais')
      .select('aluno_id, turma_id')
      .in('turma_id', especialIds);
    if (vErr) throw vErr;

    const alunoIdsEsp = [...new Set((vinculos || []).map((v) => v.aluno_id).filter(Boolean))];
    if (alunoIdsEsp.length > 0) {
      const { data, error } = await supabase.from('alunos').select('*').in('id', alunoIdsEsp);
      if (error) throw error;
      const turmaPorAluno = {};
      for (const v of vinculos || []) {
        if (!turmaPorAluno[v.aluno_id]) turmaPorAluno[v.aluno_id] = v.turma_id;
      }
      for (const a of data || []) {
        const tid = turmaPorAluno[a.id];
        byId.set(a.id, { ...a, turma_nome: turmaById[tid] || '-' });
      }
    }
  }

  return Array.from(byId.values());
}

const ChartsView = ({
  reportSchoolId,
  setReportSchoolId,
  schools,
  reportYear,
  setReportYear,
  reportClasses,
  selectedYear,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [turmaId, setTurmaId] = useState('');
  const [monthKey, setMonthKey] = useState(getDefaultMonthKey);
  const [etiquetaCor, setEtiquetaCor] = useState('');
  const [ocorrenciaTipo, setOcorrenciaTipo] = useState('');
  const [aeeFilter, setAeeFilter] = useState('all');
  const [bimestre, setBimestre] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [localPrefs, setLocalPrefs] = useState(INITIAL_LOCAL_PREFS);

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [emptyReason, setEmptyReason] = useState('');
  const [rawStudents, setRawStudents] = useState([]);
  const [sondagens, setSondagens] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [notas, setNotas] = useState([]);
  const [frequenciaHistorico, setFrequenciaHistorico] = useState([]);

  const effectiveSchoolId = reportSchoolId || '';
  const effectiveYear = reportYear || selectedYear || new Date().getFullYear();

  const escolaNome = useMemo(
    () => (schools || []).find((s) => String(s.id) === String(effectiveSchoolId))?.nome || '',
    [schools, effectiveSchoolId]
  );

  const turmaNome = useMemo(
    () => (reportClasses || []).find((t) => String(t.id) === String(turmaId))?.nome || '',
    [reportClasses, turmaId]
  );

  const periodSummary = useMemo(
    () => buildPeriodSummary({
      reportYear: effectiveYear,
      monthKey,
      turmaNome: turmaId ? turmaNome : '',
      escolaNome: effectiveSchoolId ? escolaNome : 'Todas as escolas',
    }),
    [effectiveYear, monthKey, turmaId, turmaNome, effectiveSchoolId, escolaNome]
  );

  const clearFilters = useCallback(() => {
    setTurmaId('');
    setMonthKey(getDefaultMonthKey());
    setEtiquetaCor('');
    setOcorrenciaTipo('');
    setAeeFilter('all');
    setBimestre('');
    setDisciplina('');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      setEmptyReason('');

      try {
        let turmaQuery = supabase
          .from('turmas')
          .select('id, nome, turma_especial, codigo')
          .eq('ano_letivo', effectiveYear);
        if (effectiveSchoolId) turmaQuery = turmaQuery.eq('escola_id', effectiveSchoolId);
        if (turmaId) turmaQuery = turmaQuery.eq('id', turmaId);

        const { data: turmas, error: turmasError } = await turmaQuery;
        if (turmasError) throw turmasError;

        const turmaList = turmas || [];

        if (turmaList.length === 0) {
          if (!cancelled) {
            setRawStudents([]);
            setSondagens([]);
            setOcorrencias([]);
            setNotas([]);
            setFrequenciaHistorico([]);
            setEmptyReason(`Nenhuma turma encontrada para ${effectiveYear}. Verifique o ano letivo ou cadastre turmas.`);
            setLoading(false);
          }
          return;
        }

        const studentList = await fetchAlunosDasTurmas(turmaList);
        const alunoIds = studentList.map((a) => a.id);

        const emptyRelated = () => {
          setSondagens([]);
          setOcorrencias([]);
          setNotas([]);
          setFrequenciaHistorico([]);
        };

        if (alunoIds.length === 0) {
          if (!cancelled) {
            setRawStudents([]);
            emptyRelated();
            setEmptyReason('Turmas encontradas, mas nenhum aluno vinculado. Cadastre alunos ou vincule à turma especial.');
            setLoading(false);
          }
          return;
        }

        const [sondRes, ocorRes, notasRes, freqRes] = await Promise.all([
        supabase
          .from('sondagens')
          .select('aluno_id, nivel_leitura, nivel_escrita, data')
          .in('aluno_id', alunoIds)
          .order('data', { ascending: false }),
        supabase
          .from('ocorrencias')
          .select('aluno_id, tipo, data_ocorrencia')
          .in('aluno_id', alunoIds),
        supabase
          .from('notas_boletim')
          .select('aluno_id, disciplina, bimestre, nota')
          .in('aluno_id', alunoIds),
        supabase
          .from('frequencia_historico')
          .select('aluno_id, mes_referencia, ano, percentual')
          .in('aluno_id', alunoIds),
      ]);

        if (!cancelled) {
          setRawStudents(studentList);
          setSondagens(sondRes.data || []);
          setOcorrencias(ocorRes.data || []);
          setNotas(notasRes.data || []);
          setFrequenciaHistorico(freqRes.data || []);
          setEmptyReason('');
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao carregar dados dos gráficos:', err);
        if (!cancelled) {
          setRawStudents([]);
          setSondagens([]);
          setOcorrencias([]);
          setNotas([]);
          setFrequenciaHistorico([]);
          setFetchError(err?.message || 'Erro ao carregar dados.');
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [effectiveSchoolId, effectiveYear, turmaId]);

  const students = useMemo(
    () => filterStudents(rawStudents, { etiquetaCor, aeeFilter }),
    [rawStudents, etiquetaCor, aeeFilter]
  );

  const alunoIds = useMemo(() => students.map((s) => s.id), [students]);

  const sondagemConsolidado = useMemo(
    () => buildSondagemConsolidado(sondagens, students, monthKey),
    [sondagens, students, monthKey]
  );

  const etiquetaData = useMemo(() => {
    const rows = countByEtiqueta(students);
    return enrichWithValueMode(rows, students.length, localPrefs.valueMode);
  }, [students, localPrefs.valueMode]);

  const etiquetasPorTurma = useMemo(() => countEtiquetasByTurma(students), [students]);

  const leituraData = useMemo(
    () => enrichWithValueMode(
      sondagemConsolidado.leituraData.map((d) => ({ ...d, name: d.name })),
      sondagemConsolidado.comSondagem,
      localPrefs.valueMode
    ),
    [sondagemConsolidado, localPrefs.valueMode]
  );

  const escritaData = useMemo(
    () => enrichWithValueMode(
      sondagemConsolidado.escritaData.map((d) => ({ ...d, name: d.name })),
      sondagemConsolidado.comSondagem,
      localPrefs.valueMode
    ),
    [sondagemConsolidado, localPrefs.valueMode]
  );

  const ocorrenciasTipoData = useMemo(() => {
    const rows = countOcorrenciasPorTipo(ocorrencias, {
      monthKey,
      tipo: ocorrenciaTipo || undefined,
      alunoIds,
    });
    const total = rows.reduce((s, r) => s + r.value, 0);
    return enrichWithValueMode(rows, total, localPrefs.valueMode);
  }, [ocorrencias, monthKey, ocorrenciaTipo, alunoIds, localPrefs.valueMode]);

  const ocorrenciasMesData = useMemo(() => {
    const rows = countOcorrenciasPorMes(ocorrencias, {
      tipo: ocorrenciaTipo || undefined,
      alunoIds,
    });
    const total = rows.reduce((s, r) => s + r.value, 0);
    return enrichWithValueMode(rows, total, localPrefs.valueMode);
  }, [ocorrencias, ocorrenciaTipo, alunoIds, localPrefs.valueMode]);

  const notasDisciplinaData = useMemo(() => {
    return aggregateNotasPorDisciplina(notas, {
      bimestre: bimestre || undefined,
      disciplina: disciplina || undefined,
      alunoIds,
    });
  }, [notas, bimestre, disciplina, alunoIds]);

  const alunosAbaixoMedia = useMemo(
    () => getAlunosAbaixoMedia(notas, students, {
      threshold: DEFAULT_MEDIA_MINIMA,
      bimestre: bimestre || undefined,
      disciplina: disciplina || undefined,
    }),
    [notas, students, bimestre, disciplina]
  );

  const frequenciaData = useMemo(
    () => countFrequenciaPorFaixa(students, frequenciaHistorico, { monthKey, reportYear }),
    [students, frequenciaHistorico, monthKey, reportYear]
  );

  const aeeAgg = useMemo(() => countAeeAgregado(students), [students]);

  const disciplinasDisponiveis = useMemo(() => {
    const set = new Set((notas || []).map((n) => n.disciplina).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [notas]);

  const bimestresDisponiveis = useMemo(() => {
    const set = new Set((notas || []).map((n) => String(n.bimestre)).filter(Boolean));
    return [...set].sort();
  }, [notas]);

  const comparativoLeituraEscrita = useMemo(() => {
    const map = {};
    for (const d of leituraData) map[d.name] = { nivel: d.name, leitura: d.value, escrita: 0 };
    for (const d of escritaData) {
      if (!map[d.name]) map[d.name] = { nivel: d.name, leitura: 0, escrita: 0 };
      map[d.name].escrita = d.value;
    }
    return Object.values(map).sort((a, b) => (b.leitura + b.escrita) - (a.leitura + a.escrita));
  }, [leituraData, escritaData]);

  const renderEtiquetaChart = () => {
    if (etiquetaData.length === 0) {
      return <ChartEmpty message="Nenhum aluno encontrado para exibir etiquetas." />;
    }

    if (localPrefs.etiquetaChart === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={etiquetaData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip content={<ChartTooltip valueMode={localPrefs.valueMode} />} />
            <Bar dataKey="value" name="Alunos" radius={[4, 4, 0, 0]}>
              {etiquetaData.map((entry) => (
                <Cell key={entry.cor} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    const innerRadius = localPrefs.etiquetaChart === 'donut' ? 55 : 0;

    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={etiquetaData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={100}
            label={({ name, value, percent }) =>
              `${name}: ${value} (${Math.round(percent * 100)}%)`
            }
            labelLine={false}
          >
            {etiquetaData.map((entry) => (
              <Cell key={entry.cor} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip valueMode={localPrefs.valueMode} />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderSondagemNivelBars = (data, color, emptyMsg) => {
    if (!data.length) return <ChartEmpty message={emptyMsg} />;
    return (
      <SondagemNivelBarChart
        data={data}
        color={color}
        tooltipContent={<ChartTooltip valueMode={localPrefs.valueMode} />}
      />
    );
  };

  return (
    <section id="view-graficos" className="view-section charts-view">
      <h2>Painel de Gráficos</h2>
      <p className="charts-intro">
        Visualize indicadores pedagógicos com filtros por escola, turma e período. Os dados são atualizados automaticamente conforme os filtros selecionados.
      </p>

      <div className="analytics-panel charts-filters-panel">
        <button
          type="button"
          className="charts-filters-toggle"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <span>
            <i className={`fas fa-chevron-${filtersOpen ? 'up' : 'down'}`} aria-hidden />
            {' '}Filtros e personalização
          </span>
          <span className="charts-period-badge">{periodSummary}</span>
        </button>

        {filtersOpen && (
          <>
            <div className="analytics-filters charts-filters-grid">
              <div className="input-group">
                <label htmlFor="charts-escola">Escola</label>
                <select
                  id="charts-escola"
                  value={reportSchoolId}
                  onChange={(e) => {
                    setReportSchoolId(e.target.value);
                    setTurmaId('');
                  }}
                 
                >
                  <option value="">Todas as escolas</option>
                  {(schools || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="charts-ano">Ano letivo</label>
                <select
                  id="charts-ano"
                  value={reportYear}
                  onChange={(e) => {
                    setReportYear(Number(e.target.value));
                    setTurmaId('');
                  }}
                 
                >
                  {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i + 1).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="charts-turma">Turma</label>
                <select
                  id="charts-turma"
                  value={turmaId}
                  onChange={(e) => setTurmaId(e.target.value)}
                 
                >
                  <option value="">Todas as turmas</option>
                  {(reportClasses || []).map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="charts-mes">Período (mês)</label>
                <input
                  id="charts-mes"
                  type="month"
                  value={monthKey}
                  onChange={(e) => setMonthKey(e.target.value)}
                 
                  aria-label="Mês de referência"
                />
              </div>

              <div className="input-group">
                <label htmlFor="charts-etiqueta">Etiqueta</label>
                <select
                  id="charts-etiqueta"
                  value={etiquetaCor}
                  onChange={(e) => setEtiquetaCor(e.target.value)}
                 
                >
                  <option value="">Todas</option>
                  {ETIQUETA_ORDER.map((cor) => (
                    <option key={cor} value={cor}>{ETIQUETA_LABELS[cor]}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="charts-ocorrencia">Tipo de ocorrência</label>
                <select
                  id="charts-ocorrencia"
                  value={ocorrenciaTipo}
                  onChange={(e) => setOcorrenciaTipo(e.target.value)}
                 
                >
                  <option value="">Todos</option>
                  {OCORRENCIA_TIPOS_PADRAO.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="charts-aee">AEE</label>
                <select
                  id="charts-aee"
                  value={aeeFilter}
                  onChange={(e) => setAeeFilter(e.target.value)}
                 
                >
                  <option value="all">Todos os alunos</option>
                  <option value="com_aee">Com AEE</option>
                  <option value="sem_aee">Sem AEE</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="charts-bimestre">Bimestre (boletim)</label>
                <select
                  id="charts-bimestre"
                  value={bimestre}
                  onChange={(e) => setBimestre(e.target.value)}
                 
                >
                  <option value="">Todos</option>
                  {bimestresDisponiveis.map((b) => (
                    <option key={b} value={b}>{b}º bimestre</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="charts-disciplina">Disciplina</label>
                <select
                  id="charts-disciplina"
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                 
                >
                  <option value="">Todas</option>
                  {disciplinasDisponiveis.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="charts-prefs-row">
              <div className="input-group charts-pref-item">
                <label htmlFor="charts-pref-tipo">Gráfico de etiquetas</label>
                <select
                  id="charts-pref-tipo"
                  value={localPrefs.etiquetaChart}
                  onChange={(e) => setLocalPrefs((p) => ({ ...p, etiquetaChart: e.target.value }))}
                 
                >
                  <option value="pie">Pizza</option>
                  <option value="donut">Rosca</option>
                  <option value="bar">Barras</option>
                </select>
              </div>
              <div className="input-group charts-pref-item">
                <label htmlFor="charts-pref-valores">Exibir valores</label>
                <select
                  id="charts-pref-valores"
                  value={localPrefs.valueMode}
                  onChange={(e) => setLocalPrefs((p) => ({ ...p, valueMode: e.target.value }))}
                 
                >
                  <option value="both">Quantidade e %</option>
                  <option value="count">Quantidade</option>
                  <option value="percent">Percentual</option>
                </select>
              </div>
              <label className="charts-checkbox">
                <input
                  type="checkbox"
                  checked={localPrefs.showWithoutData}
                  onChange={(e) => setLocalPrefs((p) => ({ ...p, showWithoutData: e.target.checked }))}
                />
                Mostrar gráficos sem dados
              </label>
              <label className="charts-checkbox">
                <input
                  type="checkbox"
                  checked={localPrefs.showSemSondagemNomes}
                  onChange={(e) => setLocalPrefs((p) => ({ ...p, showSemSondagemNomes: e.target.checked }))}
                />
                Listar alunos sem sondagem
              </label>
              <button type="button" className="btn-secondary charts-clear-btn" onClick={clearFilters}>
                Limpar filtros
              </button>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <p className="charts-loading">Carregando dados para os gráficos…</p>
      ) : fetchError ? (
        <ChartEmpty message={`Não foi possível carregar os dados: ${fetchError}`} />
      ) : students.length === 0 ? (
        <ChartEmpty
          message={
            emptyReason
            || 'Nenhum aluno encontrado para o filtro selecionado. Ajuste escola, ano letivo ou turma.'
          }
        />
      ) : (
        <div className="charts-grid">
          {/* A — Alunos por etiqueta */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={etiquetaData.length > 0}>
          <div
            className="chart-card"
            data-export-chart="etiquetas"
            data-chart-title="Alunos por etiqueta pedagógica"
          >
            <h4>Alunos por etiqueta pedagógica</h4>
            <p className="chart-subtitle">{students.length} aluno(s) no escopo · prioridade de acompanhamento</p>
            {renderEtiquetaChart()}
          </div>
          </ChartSection>

          {/* B — Etiquetas por turma */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={etiquetasPorTurma.length > 0}>
          <div
            className="chart-card"
            data-export-chart="etiquetas-turma"
            data-chart-title="Distribuição de etiquetas por turma"
          >
            <h4>Etiquetas por turma</h4>
            <p className="chart-subtitle">Comparativo entre turmas do ano letivo</p>
            {etiquetasPorTurma.length === 0 ? (
              <ChartEmpty message="Sem turmas para comparar." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, etiquetasPorTurma.length * 36)}>
                <BarChart data={etiquetasPorTurma} margin={{ top: 8, right: 16, left: 8, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="turma" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {ETIQUETA_ORDER.map((cor) => (
                    <Bar
                      key={cor}
                      dataKey={cor}
                      name={ETIQUETA_LABELS[cor]}
                      stackId="etq"
                      fill={ETIQUETA_COLORS[cor]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          </ChartSection>

          {/* C — Leitura */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={sondagemConsolidado.hasSondagens && leituraData.length > 0}>
          <div
            className="chart-card"
            data-export-chart="sondagem-leitura"
            data-chart-title="Sondagens por nível de leitura"
          >
            <h4>Sondagens por nível de leitura</h4>
            <p className="chart-subtitle">
              Sondagem mais recente por aluno em {periodSummary.split('·').pop()?.trim() || monthKey}
            </p>
            {sondagemConsolidado.hasSondagens
              ? renderSondagemNivelBars(leituraData, '#3498DB', 'Nenhum nível de leitura informado no período.')
              : <ChartEmpty message="Nenhuma sondagem de leitura no período selecionado." />}
          </div>
          </ChartSection>

          {/* D — Escrita */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={sondagemConsolidado.hasSondagens && escritaData.length > 0}>
          <div
            className="chart-card"
            data-export-chart="sondagem-escrita"
            data-chart-title="Sondagens por nível de escrita"
          >
            <h4>Sondagens por nível de escrita</h4>
            <p className="chart-subtitle">Consolidado Alfabetiza Pará — escrita</p>
            {sondagemConsolidado.hasSondagens
              ? renderSondagemNivelBars(escritaData, '#2ecc71', 'Nenhum nível de escrita informado no período.')
              : <ChartEmpty message="Nenhuma sondagem de escrita no período selecionado." />}
          </div>
          </ChartSection>

          {/* E — Comparativo leitura x escrita */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={comparativoLeituraEscrita.length > 0}>
          <div
            className="chart-card chart-card-wide"
            data-export-chart="comparativo-leitura-escrita"
            data-chart-title="Comparativo leitura x escrita"
          >
            <h4>Comparativo leitura × escrita</h4>
            <p className="chart-subtitle">Identifique desequilíbrios entre habilidades</p>
            {comparativoLeituraEscrita.length === 0 ? (
              <ChartEmpty message="Sem dados comparativos no período." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, comparativoLeituraEscrita.length * 34)}>
                <BarChart data={comparativoLeituraEscrita} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nivel" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={80} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="leitura" name="Leitura" fill="#3498DB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="escrita" name="Escrita" fill="#2ecc71" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          </ChartSection>

          {/* F — Sem sondagem */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={sondagemConsolidado.semSondagem > 0}>
          <div className="chart-card chart-card-indicator" data-export-chart="sem-sondagem">
            <h4>Alunos sem sondagem no período</h4>
            <p className="chart-subtitle">Controle operacional do consolidado</p>
            <div className="chart-kpi">
              <span className="chart-kpi-value">{sondagemConsolidado.semSondagem}</span>
              <span className="chart-kpi-label">
                de {students.length} aluno(s) · {sondagemConsolidado.comSondagem} com registro
              </span>
            </div>
            {sondagemConsolidado.semSondagem > 0 && localPrefs.showSemSondagemNomes ? (
              <ul className="chart-name-list">
                {sondagemConsolidado.semSondagemNomes.slice(0, 12).map((nome) => (
                  <li key={nome}>{nome}</li>
                ))}
                {sondagemConsolidado.semSondagemNomes.length > 12 && (
                  <li className="chart-name-more">
                    + {sondagemConsolidado.semSondagemNomes.length - 12} aluno(s)
                  </li>
                )}
              </ul>
            ) : sondagemConsolidado.semSondagem === 0 ? (
              <p className="chart-ok-msg">Todos os alunos possuem sondagem no período.</p>
            ) : null}
          </div>
          </ChartSection>

          {/* J — Ocorrências por tipo */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={ocorrenciasTipoData.length > 0}>
          <div
            className="chart-card"
            data-export-chart="ocorrencias-tipo"
            data-chart-title="Ocorrências por tipo"
          >
            <h4>Ocorrências por tipo</h4>
            <p className="chart-subtitle">Padrões de acompanhamento no período</p>
            {ocorrenciasTipoData.length === 0 ? (
              <ChartEmpty message="Nenhuma ocorrência registrada no período." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ocorrenciasTipoData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<ChartTooltip valueMode={localPrefs.valueMode} />} />
                  <Bar dataKey="value" name="Ocorrências" fill="#e67e22" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          </ChartSection>

          {/* K — Ocorrências ao longo do tempo */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={ocorrenciasMesData.length > 0}>
          <div
            className="chart-card"
            data-export-chart="ocorrencias-mes"
            data-chart-title="Ocorrências ao longo do tempo"
          >
            <h4>Ocorrências ao longo do tempo</h4>
            <p className="chart-subtitle">Evolução mensal de demandas</p>
            {ocorrenciasMesData.length === 0 ? (
              <ChartEmpty message="Sem histórico de ocorrências para exibir." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={ocorrenciasMesData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<ChartTooltip valueMode={localPrefs.valueMode} />} />
                  <Line type="monotone" dataKey="value" name="Ocorrências" stroke="#e67e22" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          </ChartSection>

          {/* G — Desempenho por disciplina */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={notasDisciplinaData.length > 0}>
          <div
            className="chart-card"
            data-export-chart="notas-disciplina"
            data-chart-title="Desempenho por disciplina"
          >
            <h4>Desempenho por disciplina (média da turma)</h4>
            <p className="chart-subtitle">Componentes com maior dificuldade</p>
            {notasDisciplinaData.length === 0 ? (
              <ChartEmpty message="Sem notas de boletim para os filtros selecionados." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, notasDisciplinaData.length * 30)}>
                <BarChart data={notasDisciplinaData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v, _n, p) => [`Média ${v}`, `${p.payload.total} nota(s)`]} />
                  <Bar dataKey="value" name="Média" fill="#8e44ad" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          </ChartSection>

          {/* H — Alunos abaixo da média */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={alunosAbaixoMedia.length > 0}>
          <div className="chart-card chart-card-indicator" data-export-chart="abaixo-media">
            <h4>Alunos abaixo da média ({DEFAULT_MEDIA_MINIMA})</h4>
            <p className="chart-subtitle">Priorização de intervenção</p>
            <div className="chart-kpi">
              <span className="chart-kpi-value">{alunosAbaixoMedia.length}</span>
              <span className="chart-kpi-label">aluno(s) no escopo filtrado</span>
            </div>
            {alunosAbaixoMedia.length > 0 ? (
              <div className="chart-table-wrap">
                <table className="chart-summary-table">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Turma</th>
                      <th>Média</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosAbaixoMedia.slice(0, 15).map((row) => (
                      <tr key={row.alunoId}>
                        <td>{row.nome}</td>
                        <td>{row.turma}</td>
                        <td>{row.media}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {alunosAbaixoMedia.length > 15 && (
                  <p className="chart-name-more">+ {alunosAbaixoMedia.length - 15} aluno(s)</p>
                )}
              </div>
            ) : (
              <p className="chart-ok-msg">Nenhum aluno abaixo da média nos filtros atuais.</p>
            )}
          </div>
          </ChartSection>

          {/* I — Frequência */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={frequenciaData.some((d) => d.value > 0)}>
          <div
            className="chart-card"
            data-export-chart="frequencia"
            data-chart-title="Frequência por faixa"
          >
            <h4>Frequência / infrequência</h4>
            <p className="chart-subtitle">Faixas: adequada ≥85%, atenção 75–84%, risco &lt;75%</p>
            {frequenciaData.every((d) => d.value === 0) ? (
              <ChartEmpty message="Sem dados de frequência para o escopo." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={frequenciaData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Alunos" radius={[4, 4, 0, 0]}>
                    {frequenciaData.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={
                          entry.id === 'adequada' ? '#2ecc71'
                            : entry.id === 'atencao' ? '#f1c40f'
                              : entry.id === 'risco' ? '#e74c3c'
                                : '#95a5a6'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          </ChartSection>

          {/* L — AEE agregado */}
          <ChartSection show showWithoutData={localPrefs.showWithoutData} hasData={aeeAgg.comAee > 0}>
          <div className="chart-card chart-card-indicator" data-export-chart="aee">
            <h4>Alunos AEE (agregado)</h4>
            <p className="chart-subtitle">Dados agregados — sem exposição de laudo ou CID</p>
            <div className="chart-kpi-row">
              <div className="chart-kpi-mini">
                <span className="chart-kpi-value">{aeeAgg.comAee}</span>
                <span className="chart-kpi-label">Com AEE</span>
              </div>
              <div className="chart-kpi-mini">
                <span className="chart-kpi-value">{aeeAgg.semAee}</span>
                <span className="chart-kpi-label">Sem AEE</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[
                  { name: 'Com AEE', value: aeeAgg.comAee, fill: ETIQUETA_COLORS.roxo },
                  { name: 'Sem AEE', value: aeeAgg.semAee, fill: '#bdc3c7' },
                ]}
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Alunos" radius={[4, 4, 0, 0]}>
                  <Cell fill={ETIQUETA_COLORS.roxo} />
                  <Cell fill="#bdc3c7" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          </ChartSection>
        </div>
      )}

      {/* Metadados ocultos para exportação futura */}
      <div className="charts-export-meta" aria-hidden="true" hidden>
        {JSON.stringify(chartExportMeta('painel', 'Painel de Gráficos SACP', { periodSummary }))}
      </div>
    </section>
  );
};

export default ChartsView;
