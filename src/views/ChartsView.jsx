import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { supabase } from '../supabaseClient';
import {
  ETIQUETA_ORDER,
  aggregateAee,
  aggregateEtiquetas,
  aggregateEtiquetasPorTurma,
  aggregateFrequencia,
  aggregateNotasPorDisciplina,
  aggregateOcorrenciasPorMes,
  aggregateOcorrenciasPorTipo,
  alunosAbaixoMedia,
  attachTurmaInfo,
  buildSondagemComparison,
  countByField,
  filterAlunosForCharts,
  filterNotas,
  filterRowsByAlunoAndMonth,
  formatMonthKey,
  getMonthLabel,
  latestSondagensForMonth,
  scopeTurmas,
  studentsWithoutSondagem,
  uniqueSorted,
  withPercent,
} from '../utils/chartsData';

const etiquetaColors = {
  azul: '#3498DB',
  verde: '#2ECC71',
  amarelo: '#F1C40F',
  vermelho: '#E74C3C',
  roxo: '#9B59B6',
};

async function safeQuery(label, query, warnings) {
  const { data, error } = await query;
  if (error) {
    warnings.push(`${label}: ${error.message}`);
    return [];
  }
  return data || [];
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="charts-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={`${item.name}-${item.dataKey}`} style={{ color: item.color }}>
          {item.name}: {item.value}
          {item.payload?.percent != null && item.dataKey !== 'percent' ? ` (${item.payload.percent}%)` : ''}
        </div>
      ))}
    </div>
  );
};

const ChartCard = ({ title, subtitle, children, hasData = true, emptyMessage = 'Sem dados para este filtro.' }) => (
  <section className="chart-card chart-card-enhanced">
    <div className="chart-card-header">
      <h4>{title}</h4>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {hasData ? children : <div className="chart-empty">{emptyMessage}</div>}
  </section>
);

const ChartsView = ({
  reportSchoolId,
  setReportSchoolId,
  schools,
  reportYear,
  setReportYear,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [referenceMonth, setReferenceMonth] = useState(() => formatMonthKey());
  const [etiquetaFilter, setEtiquetaFilter] = useState('');
  const [ocorrenciaTipoFilter, setOcorrenciaTipoFilter] = useState('');
  const [aeeFilter, setAeeFilter] = useState('todos');
  const [bimestreFilter, setBimestreFilter] = useState('');
  const [disciplinaFilter, setDisciplinaFilter] = useState('');
  const [etiquetaChartType, setEtiquetaChartType] = useState('rosca');
  const [metricMode, setMetricMode] = useState('ambos');
  const [showEmptyCharts, setShowEmptyCharts] = useState(true);
  const [showSemSondagemList, setShowSemSondagemList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [dataset, setDataset] = useState({
    turmas: [],
    alunos: [],
    sondagens: [],
    ocorrencias: [],
    notas: [],
    frequencias: [],
    yearFallback: false,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchChartsDataset = async () => {
      setLoading(true);
      const nextWarnings = [];

      const turmasRaw = await safeQuery(
        'Turmas',
        supabase.from('turmas').select('*').order('nome', { ascending: true }),
        nextWarnings
      );
      const { turmas, yearFallback } = scopeTurmas(turmasRaw, {
        schoolId: reportSchoolId,
        year: reportYear,
      });

      if (yearFallback) {
        nextWarnings.push(
          `Não encontrei turmas com ano letivo ${reportYear}; os gráficos estão usando as turmas disponíveis no escopo selecionado.`
        );
      }

      const turmaIds = turmas.map((turma) => turma.id).filter(Boolean);
      if (turmaIds.length === 0) {
        if (!cancelled) {
          setDataset({
            turmas: [],
            alunos: [],
            sondagens: [],
            ocorrencias: [],
            notas: [],
            frequencias: [],
            yearFallback,
          });
          setWarnings(nextWarnings);
          setLoading(false);
        }
        return;
      }

      const alunosRaw = await safeQuery(
        'Alunos',
        supabase.from('alunos').select('*').in('turma_id', turmaIds).order('nome', { ascending: true }),
        nextWarnings
      );
      const alunoIds = alunosRaw.map((aluno) => aluno.id).filter(Boolean);

      let sondagens = [];
      let ocorrencias = [];
      let notas = [];
      let frequencias = [];

      if (alunoIds.length > 0) {
        [sondagens, ocorrencias, notas, frequencias] = await Promise.all([
          safeQuery(
            'Sondagens',
            supabase.from('sondagens').select('*').in('aluno_id', alunoIds).order('data', { ascending: false }),
            nextWarnings
          ),
          safeQuery(
            'Ocorrências',
            supabase.from('ocorrencias').select('*').in('aluno_id', alunoIds).order('data_ocorrencia', { ascending: false }),
            nextWarnings
          ),
          safeQuery(
            'Boletim',
            supabase.from('notas_boletim').select('*').in('aluno_id', alunoIds),
            nextWarnings
          ),
          safeQuery(
            'Frequência',
            supabase.from('frequencia_historico').select('*').in('aluno_id', alunoIds),
            nextWarnings
          ),
        ]);
      }

      if (!cancelled) {
        setDataset({
          turmas,
          alunos: attachTurmaInfo(alunosRaw, turmas),
          sondagens,
          ocorrencias,
          notas,
          frequencias,
          yearFallback,
        });
        setWarnings(nextWarnings);
        setLoading(false);
      }
    };

    fetchChartsDataset();

    return () => {
      cancelled = true;
    };
  }, [reportSchoolId, reportYear]);

  const monthLabel = useMemo(() => getMonthLabel(referenceMonth), [referenceMonth]);

  const availableTurmas = dataset.turmas;
  const ocorrenciaTipos = useMemo(
    () => uniqueSorted(dataset.ocorrencias.map((ocorrencia) => ocorrencia.tipo)),
    [dataset.ocorrencias]
  );
  const disciplinas = useMemo(
    () => uniqueSorted(dataset.notas.map((nota) => nota.disciplina)),
    [dataset.notas]
  );

  const filtered = useMemo(() => {
    const alunos = filterAlunosForCharts(dataset.alunos, {
      turmaId: selectedTurmaId,
      etiqueta: etiquetaFilter,
      aee: aeeFilter,
    });
    const alunoIds = alunos.map((aluno) => aluno.id);
    const latestSondagens = latestSondagensForMonth(dataset.sondagens, alunoIds, referenceMonth);
    const leituraData = countByField(latestSondagens, 'nivel_leitura');
    const escritaData = countByField(latestSondagens, 'nivel_escrita');
    const ocorrenciasMes = filterRowsByAlunoAndMonth(dataset.ocorrencias, alunoIds, referenceMonth);
    const notasFiltradas = filterNotas(dataset.notas, alunoIds, {
      bimestre: bimestreFilter,
      disciplina: disciplinaFilter,
    });

    return {
      alunos,
      alunoIds,
      etiquetas: withPercent(aggregateEtiquetas(alunos), alunos.length),
      etiquetasPorTurma: aggregateEtiquetasPorTurma(alunos),
      latestSondagens,
      leituraData,
      escritaData,
      comparativoSondagem: buildSondagemComparison(leituraData, escritaData),
      semSondagem: studentsWithoutSondagem(alunos, latestSondagens),
      ocorrenciasTipo: aggregateOcorrenciasPorTipo(ocorrenciasMes, ocorrenciaTipoFilter),
      ocorrenciasTempo: aggregateOcorrenciasPorMes(filterRowsByAlunoAndMonth(dataset.ocorrencias, alunoIds, null)),
      notasPorDisciplina: aggregateNotasPorDisciplina(notasFiltradas),
      abaixoMedia: alunosAbaixoMedia(notasFiltradas),
      frequencia: aggregateFrequencia(dataset.frequencias, alunoIds, referenceMonth),
      aee: withPercent(aggregateAee(alunos), alunos.length),
    };
  }, [
    aeeFilter,
    bimestreFilter,
    dataset.alunos,
    dataset.frequencias,
    dataset.notas,
    dataset.ocorrencias,
    dataset.sondagens,
    disciplinaFilter,
    etiquetaFilter,
    ocorrenciaTipoFilter,
    referenceMonth,
    selectedTurmaId,
  ]);

  const clearFilters = () => {
    setSelectedTurmaId('');
    setReferenceMonth(formatMonthKey());
    setEtiquetaFilter('');
    setOcorrenciaTipoFilter('');
    setAeeFilter('todos');
    setBimestreFilter('');
    setDisciplinaFilter('');
    setEtiquetaChartType('rosca');
    setMetricMode('ambos');
    setShowEmptyCharts(true);
    setShowSemSondagemList(true);
  };

  const shouldShow = (data) => showEmptyCharts || (data || []).length > 0;
  const etiquetaDataKey = metricMode === 'percentual' ? 'percent' : 'total';
  const etiquetaUnit = metricMode === 'percentual' ? '%' : 'alunos';

  return (
    <div id="view-graficos" className="view-section charts-view">
      <div className="charts-title-row">
        <div>
          <h2>Gráficos</h2>
          <p style={{ color: 'var(--text-light)', marginBottom: 0 }}>
            Painel pedagógico visual para acompanhar etiquetas, sondagens, ocorrências, boletim, frequência e AEE.
          </p>
        </div>
        <span className="charts-period-badge">Período: {monthLabel}</span>
      </div>

      <div className="charts-filter-shell">
        <button
          type="button"
          className="charts-filter-toggle"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <i className={`fas fa-chevron-${filtersOpen ? 'up' : 'down'}`} />
          Filtros e personalização
        </button>

        {filtersOpen && (
          <div className="charts-filter-grid">
            <label>
              Escola
              <select
                value={reportSchoolId}
                onChange={(e) => {
                  setReportSchoolId(e.target.value);
                  setSelectedTurmaId('');
                }}
              >
                <option value="">Todas as escolas</option>
                {(schools || []).map((school) => (
                  <option key={school.id} value={school.id}>{school.nome}</option>
                ))}
              </select>
            </label>

            <label>
              Ano letivo
              <select value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}>
                {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i + 1).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>

            <label>
              Turma
              <select value={selectedTurmaId} onChange={(e) => setSelectedTurmaId(e.target.value)}>
                <option value="">Todas as turmas</option>
                {availableTurmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>{turma.nome}</option>
                ))}
              </select>
            </label>

            <label>
              Mês/período
              <input type="month" value={referenceMonth} onChange={(e) => setReferenceMonth(e.target.value)} />
            </label>

            <label>
              Etiqueta
              <select value={etiquetaFilter} onChange={(e) => setEtiquetaFilter(e.target.value)}>
                <option value="">Todas</option>
                <option value="azul">Adequado</option>
                <option value="verde">Avançado</option>
                <option value="amarelo">Atenção</option>
                <option value="vermelho">Risco</option>
                <option value="roxo">AEE</option>
              </select>
            </label>

            <label>
              Tipo de ocorrência
              <select value={ocorrenciaTipoFilter} onChange={(e) => setOcorrenciaTipoFilter(e.target.value)}>
                <option value="">Todos</option>
                {ocorrenciaTipos.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </label>

            <label>
              AEE
              <select value={aeeFilter} onChange={(e) => setAeeFilter(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="com">Com AEE</option>
                <option value="sem">Sem AEE</option>
              </select>
            </label>

            <label>
              Bimestre
              <select value={bimestreFilter} onChange={(e) => setBimestreFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="1">1º bimestre</option>
                <option value="2">2º bimestre</option>
                <option value="3">3º bimestre</option>
                <option value="4">4º bimestre</option>
              </select>
            </label>

            <label>
              Disciplina
              <select value={disciplinaFilter} onChange={(e) => setDisciplinaFilter(e.target.value)}>
                <option value="">Todas</option>
                {disciplinas.map((disciplina) => (
                  <option key={disciplina} value={disciplina}>{disciplina}</option>
                ))}
              </select>
            </label>

            <label>
              Gráfico de etiquetas
              <select value={etiquetaChartType} onChange={(e) => setEtiquetaChartType(e.target.value)}>
                <option value="rosca">Rosca</option>
                <option value="pizza">Pizza</option>
                <option value="barras">Barras</option>
              </select>
            </label>

            <label>
              Exibição
              <select value={metricMode} onChange={(e) => setMetricMode(e.target.value)}>
                <option value="quantidade">Quantidade</option>
                <option value="percentual">Percentual</option>
                <option value="ambos">Quantidade e percentual</option>
              </select>
            </label>

            <div className="charts-checks">
              <label>
                <input
                  type="checkbox"
                  checked={showEmptyCharts}
                  onChange={(e) => setShowEmptyCharts(e.target.checked)}
                />
                Mostrar gráficos sem dados
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showSemSondagemList}
                  onChange={(e) => setShowSemSondagemList(e.target.checked)}
                />
                Listar alunos sem sondagem
              </label>
            </div>

            <button type="button" className="btn-secondary charts-clear-btn" onClick={clearFilters}>
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="charts-warning">
          <strong>Avisos de dados:</strong>
          <ul>
            {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-light)' }}>Carregando dados para os gráficos...</p>
      ) : filtered.alunos.length === 0 ? (
        <div className="chart-empty chart-empty-main">
          <strong>Nenhum aluno encontrado para os filtros selecionados.</strong>
          <p>
            Confira escola, turma e etiqueta. Se houver alunos cadastrados, verifique se eles estão vinculados a uma
            turma no cadastro.
          </p>
        </div>
      ) : (
        <>
          <div className="charts-kpi-grid">
            <div className="charts-kpi-card">
              <span>Alunos no filtro</span>
              <strong>{filtered.alunos.length}</strong>
            </div>
            <div className="charts-kpi-card">
              <span>Com sondagem no mês</span>
              <strong>{filtered.latestSondagens.length}</strong>
            </div>
            <div className="charts-kpi-card">
              <span>Sem sondagem no mês</span>
              <strong>{filtered.semSondagem.length}</strong>
            </div>
            <div className="charts-kpi-card">
              <span>Abaixo da média</span>
              <strong>{filtered.abaixoMedia}</strong>
            </div>
          </div>

          <div className="charts-grid-enhanced">
            {shouldShow(filtered.etiquetas) && (
              <ChartCard
                title="Alunos por etiqueta"
                subtitle="Distribuição atual dos alunos por prioridade pedagógica."
                hasData={filtered.etiquetas.length > 0}
              >
                <ResponsiveContainer width="100%" height={300}>
                  {etiquetaChartType === 'barras' ? (
                    <BarChart data={filtered.etiquetas} margin={{ top: 12, right: 16, left: 8, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} unit={etiquetaUnit === '%' ? '%' : undefined} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey={etiquetaDataKey} name={etiquetaUnit} radius={[6, 6, 0, 0]}>
                        {filtered.etiquetas.map((entry) => (
                          <Cell key={entry.cor} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={filtered.etiquetas}
                        dataKey={etiquetaDataKey}
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={etiquetaChartType === 'rosca' ? 62 : 0}
                        outerRadius={100}
                        label={({ name, total, percent }) =>
                          metricMode === 'percentual'
                            ? `${name}: ${percent}%`
                            : metricMode === 'ambos'
                              ? `${name}: ${total} (${percent}%)`
                              : `${name}: ${total}`
                        }
                      >
                        {filtered.etiquetas.map((entry) => (
                          <Cell key={entry.cor} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </ChartCard>
            )}

            {shouldShow(filtered.etiquetasPorTurma) && (
              <ChartCard
                title="Etiquetas por turma"
                subtitle="Compara concentração de risco/atenção entre turmas."
                hasData={filtered.etiquetasPorTurma.length > 0}
              >
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={filtered.etiquetasPorTurma} margin={{ top: 12, right: 12, left: 8, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="turma" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    {ETIQUETA_ORDER.map((cor) => (
                      <Bar key={cor} dataKey={cor} stackId="etiquetas" fill={etiquetaColors[cor]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {shouldShow(filtered.leituraData) && (
              <ChartCard
                title="Sondagens por nível de leitura"
                subtitle={`Mais recente por aluno em ${monthLabel}.`}
                hasData={filtered.leituraData.length > 0}
                emptyMessage="Nenhuma sondagem de leitura encontrada neste mês."
              >
                <ResponsiveContainer width="100%" height={Math.max(280, filtered.leituraData.length * 36)}>
                  <BarChart data={filtered.leituraData} layout="vertical" margin={{ left: 130, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Alunos" fill="#0D6EFD" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {shouldShow(filtered.escritaData) && (
              <ChartCard
                title="Sondagens por nível de escrita"
                subtitle={`Mais recente por aluno em ${monthLabel}.`}
                hasData={filtered.escritaData.length > 0}
                emptyMessage="Nenhuma sondagem de escrita encontrada neste mês."
              >
                <ResponsiveContainer width="100%" height={Math.max(280, filtered.escritaData.length * 36)}>
                  <BarChart data={filtered.escritaData} layout="vertical" margin={{ left: 130, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Alunos" fill="#198754" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {shouldShow(filtered.comparativoSondagem) && (
              <ChartCard
                title="Comparativo leitura x escrita"
                subtitle="Ajuda a perceber desequilíbrios entre os dois eixos."
                hasData={filtered.comparativoSondagem.length > 0}
              >
                <ResponsiveContainer width="100%" height={Math.max(300, filtered.comparativoSondagem.length * 38)}>
                  <BarChart data={filtered.comparativoSondagem} layout="vertical" margin={{ left: 130, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leitura" name="Leitura" fill="#0D6EFD" />
                    <Bar dataKey="escrita" name="Escrita" fill="#198754" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {showSemSondagemList && (
              <ChartCard
                title="Alunos sem sondagem no período"
                subtitle="Controle operacional para não deixar aluno fora do consolidado."
                hasData={filtered.semSondagem.length > 0}
                emptyMessage="Todos os alunos filtrados possuem sondagem no mês selecionado."
              >
                <div className="charts-name-list">
                  {filtered.semSondagem.slice(0, 40).map((aluno) => (
                    <span key={aluno.id}>{aluno.nome}</span>
                  ))}
                  {filtered.semSondagem.length > 40 && (
                    <em>+ {filtered.semSondagem.length - 40} aluno(s)</em>
                  )}
                </div>
              </ChartCard>
            )}

            {shouldShow(filtered.ocorrenciasTipo) && (
              <ChartCard
                title="Ocorrências por tipo"
                subtitle={`Registros em ${monthLabel}.`}
                hasData={filtered.ocorrenciasTipo.length > 0}
                emptyMessage="Nenhuma ocorrência encontrada neste mês."
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filtered.ocorrenciasTipo} margin={{ top: 12, right: 16, left: 8, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-25} textAnchor="end" height={55} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" name="Ocorrências" fill="#F97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {shouldShow(filtered.ocorrenciasTempo) && (
              <ChartCard
                title="Ocorrências ao longo do tempo"
                subtitle="Visão mensal dos registros no escopo filtrado."
                hasData={filtered.ocorrenciasTempo.length > 0}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filtered.ocorrenciasTempo} margin={{ top: 12, right: 16, left: 8, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" name="Ocorrências" fill="#EA580C" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {shouldShow(filtered.notasPorDisciplina) && (
              <ChartCard
                title="Desempenho por disciplina"
                subtitle="Média das notas no filtro de boletim."
                hasData={filtered.notasPorDisciplina.length > 0}
                emptyMessage="Nenhuma nota encontrada para o filtro de boletim."
              >
                <ResponsiveContainer width="100%" height={Math.max(280, filtered.notasPorDisciplina.length * 36)}>
                  <BarChart data={filtered.notasPorDisciplina} layout="vertical" margin={{ left: 125, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 10]} />
                    <YAxis type="category" dataKey="disciplina" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="media" name="Média" fill="#7C3AED" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {shouldShow(filtered.frequencia) && (
              <ChartCard
                title="Frequência por faixa"
                subtitle={`Histórico de frequência em ${monthLabel}.`}
                hasData={filtered.frequencia.length > 0}
                emptyMessage="Nenhum histórico de frequência encontrado neste mês."
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={filtered.frequencia} margin={{ top: 12, right: 16, left: 8, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" name="Alunos" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {shouldShow(filtered.aee) && (
              <ChartCard
                title="AEE agregado"
                subtitle="Apenas totais, sem expor laudo, CID ou detalhe sensível."
                hasData={filtered.aee.length > 0}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={filtered.aee} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={95} label>
                      {filtered.aee.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChartsView;
