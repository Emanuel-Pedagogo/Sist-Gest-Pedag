import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const ChartsView = ({
  reportSchoolId,
  setReportSchoolId,
  schools,
  reportYear,
  setReportYear,
  chartLoading,
  chartDataList,
}) => {
  return (
    <div id="view-graficos" className="view-section">
      <h2>Gráficos</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 20 }}>
        Visualize a distribuição de alunos por etiqueta, turma e nível de leitura. Use os filtros para o mesmo escopo de escola e ano dos relatórios — assim os dados não se conflitam.
      </p>

      <div className="analytics-panel">
        <div className="analytics-filters">
          <div className="input-group" style={{ minWidth: 180 }}>
            <label style={{ margin: 0, marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>Escola</label>
            <select
              value={reportSchoolId}
              onChange={(e) => setReportSchoolId(e.target.value)}
              style={{ width: '100%', padding: '9px 10px', height: 38, borderRadius: 6, border: '1px solid #ddd' }}
            >
              <option value="">Todas as escolas</option>
              {(schools || []).map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div className="input-group" style={{ width: 100 }}>
            <label style={{ margin: 0, marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>Ano letivo</label>
            <select
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              style={{ width: '100%', padding: '9px 10px', height: 38, borderRadius: 6, border: '1px solid #ddd' }}
            >
              {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i + 1).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {chartLoading ? (
        <p style={{ color: 'var(--text-light)' }}>Carregando dados para os gráficos...</p>
      ) : chartDataList.length === 0 ? (
        <p style={{ color: 'var(--text-light)' }}>
          Nenhum aluno encontrado para o filtro selecionado. Ajuste escola e ano letivo.
        </p>
      ) : (
        <>
          {(() => {
            const etiquetaLabels = { azul: 'Adequado', verde: 'Avançado', amarelo: 'Atenção', vermelho: 'Risco', roxo: 'AEE' };
            const etiquetaCores = { azul: '#3498DB', verde: '#2ecc71', amarelo: '#f1c40f', vermelho: '#e74c3c', roxo: '#9b59b6' };
            const ordemEtiquetas = ['azul', 'verde', 'amarelo', 'vermelho', 'roxo'];
            const byEtiqueta = chartDataList.reduce((acc, a) => {
              const cor = a.etiqueta_cor || 'azul';
              acc[cor] = (acc[cor] || 0) + 1;
              return acc;
            }, {});
            const pieData = ordemEtiquetas
              .filter((cor) => (byEtiqueta[cor] || 0) > 0)
              .map((cor) => ({
                name: etiquetaLabels[cor] || cor,
                value: byEtiqueta[cor],
                cor,
              }));

            const byTurma = chartDataList.reduce((acc, a) => {
              const t = a.turma_nome || '-';
              acc[t] = (acc[t] || 0) + 1;
              return acc;
            }, {});
            const barTurmaData = Object.entries(byTurma)
              .map(([turma, total]) => ({ turma, total }))
              .sort((a, b) => (a.turma > b.turma ? 1 : -1));

            const byNivel = chartDataList.reduce((acc, a) => {
              const n = a.nivel_leitura || 'Sem registro';
              acc[n] = (acc[n] || 0) + 1;
              return acc;
            }, {});
            const barNivelData = Object.entries(byNivel)
              .map(([nivel, total]) => ({ nivel, total }))
              .sort((a, b) => b.total - a.total);

            return (
              <div className="charts-stack">
                <div className="chart-card">
                  <h4>Alunos por etiqueta</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.cor} fill={etiquetaCores[entry.cor]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h4>Alunos por turma</h4>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={barTurmaData} margin={{ top: 8, right: 16, left: 8, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="turma" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" name="Alunos" fill="#3498DB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h4>Alunos por nível de leitura</h4>
                  <ResponsiveContainer width="100%" height={Math.max(320, barNivelData.length * 28)}>
                    <BarChart data={barNivelData} layout="vertical" margin={{ left: 120, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="nivel" width={115} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total" name="Alunos" fill="#2ecc71" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

export default ChartsView;
