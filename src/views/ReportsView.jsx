import React from 'react';
import {
  formatNivel,
  NIVEL_LEITURA_OPCOES_1_2,
  NIVEL_LEITURA_OPCOES_3_5,
  NIVEL_LEITURA_OPCOES_FUNDAMENTAL2,
} from '../utils/sondagemNiveis';

const ReportsView = ({
  reportSchoolId,
  setReportSchoolId,
  setReportGradeLevels,
  schools,
  reportYear,
  setReportYear,
  reportGradeLevels,
  reportClasses,
  reportAvailableGrades,
  reportEtiqueta,
  setReportEtiqueta,
  reportNivelLeitura,
  setReportNivelLeitura,
  reportNotasFilter,
  setReportNotasFilter,
  reportFaltasFilter,
  setReportFaltasFilter,
  handleGenerateReport,
  reportLoading,
  reportGenerated,
  reportList,
  exportReportPDF,
  exportReportWord,
  getEtiquetaLabel,
}) => {
  return (
    <section id="view-reports" className="view-section">
      <h2>Relatórios e Listas</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 20 }}>
        Gere listas de alunos por escola, turma, etiqueta ou nível de leitura e exporte em PDF ou Word.
      </p>

      <div className="analytics-panel">
        {/* Linha 1: Escola, Ano e Turmas na mesma linha */}
        <div className="reports-filters-row">
          <div className="input-group reports-filter--escola">
            <label htmlFor="report-escola">Escola</label>
            <select
              id="report-escola"
              value={reportSchoolId}
              onChange={(e) => {
                setReportSchoolId(e.target.value);
                setReportGradeLevels(null);
              }}
            >
              <option value="">Todas as escolas</option>
              {(schools || []).map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div className="input-group reports-filter--ano">
            <label htmlFor="report-ano">Ano letivo</label>
            <select
              id="report-ano"
              value={reportYear}
              onChange={(e) => {
                setReportYear(Number(e.target.value));
                setReportGradeLevels(null);
              }}
            >
              {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i + 1).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="input-group reports-filter--turmas">
            <div className="reports-turmas-header">
              <label id="report-turmas-label">
                Turma(s)
                <span className="reports-turmas-count">
                  ({reportGradeLevels === null ? 'Todas' : reportGradeLevels.length === 0 ? 'Nenhuma' : reportGradeLevels.length + ' sel.'})
                </span>
              </label>
              {reportClasses.length > 0 && (
                <div className="reports-turmas-actions">
                  <button type="button" className="reports-mini-btn" onClick={() => setReportGradeLevels(null)}>
                    Todas
                  </button>
                  <button type="button" className="reports-mini-btn reports-mini-btn--muted" onClick={() => setReportGradeLevels([])}>
                    Limpar
                  </button>
                </div>
              )}
            </div>
            <div className="reports-grade-picker" role="group" aria-labelledby="report-turmas-label">
              {reportClasses.length === 0 ? (
                <span className="reports-grade-picker__loading">Carregando...</span>
              ) : (
                reportAvailableGrades.map((grade) => {
                  const selecionada = reportGradeLevels === null || reportGradeLevels.includes(grade);
                  return (
                    <label key={grade} className={`reports-grade-chip${selecionada ? ' is-active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selecionada}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const next =
                              reportGradeLevels === null
                                ? reportAvailableGrades.filter((g) => g !== grade)
                                : [...reportGradeLevels, grade];
                            const all = next.length === reportAvailableGrades.length;
                            setReportGradeLevels(all ? null : next);
                          } else {
                            const next =
                              reportGradeLevels === null
                                ? reportAvailableGrades.filter((g) => g !== grade)
                                : reportGradeLevels.filter((g) => g !== grade);
                            setReportGradeLevels(next);
                          }
                        }}
                      />
                      <span>{grade}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Linha 2: Etiqueta, Nível de leitura, Notas, Faltas, Gerar lista - tudo na mesma linha */}
        <div className="reports-filters-grid">
          <div className="input-group">
            <label htmlFor="report-etiqueta">Etiqueta</label>
            <select
              id="report-etiqueta"
              value={reportEtiqueta}
              onChange={(e) => setReportEtiqueta(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="azul">Adequado</option>
              <option value="verde">Avançado</option>
              <option value="amarelo">Atenção</option>
              <option value="vermelho">Risco</option>
              <option value="roxo">AEE</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="report-nivel-leitura">Nível de leitura</label>
            <select
              id="report-nivel-leitura"
              value={reportNivelLeitura}
              onChange={(e) => setReportNivelLeitura(e.target.value)}
            >
              <option value="">Qualquer</option>
              <optgroup label="1º e 2º ano">
                {NIVEL_LEITURA_OPCOES_1_2.map((op) => (
                  <option key={op} value={op}>{formatNivel(op)}</option>
                ))}
              </optgroup>
              <optgroup label="3º ao 5º ano">
                {NIVEL_LEITURA_OPCOES_3_5.map((op) => (
                  <option key={op} value={op}>{formatNivel(op)}</option>
                ))}
              </optgroup>
              <optgroup label="6º ao 9º ano">
                {NIVEL_LEITURA_OPCOES_FUNDAMENTAL2.map((op) => (
                  <option key={op} value={op}>{formatNivel(op)}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="report-notas">Notas</label>
            <select
              id="report-notas"
              value={reportNotasFilter}
              onChange={(e) => setReportNotasFilter(e.target.value)}
            >
              <option value="nao">Não mostrar notas</option>
              <option value="acima">Acima da média (≥5)</option>
              <option value="abaixo">Abaixo da média (&lt;5)</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="report-faltas">Faltas</label>
            <select
              id="report-faltas"
              value={reportFaltasFilter}
              onChange={(e) => setReportFaltasFilter(e.target.value)}
            >
              <option value="nao">Não mostrar faltas</option>
              <option value="sim">Mostrar faltas</option>
            </select>
          </div>
          <div className="reports-generate-cell">
            <button
              type="button"
              className="btn-primary reports-generate-btn"
              onClick={handleGenerateReport}
              disabled={reportLoading}
            >
              {reportLoading ? 'Gerando...' : 'Gerar lista'}
            </button>
          </div>
        </div>
      </div>

      {reportGenerated && (
        <div className="analytics-panel">
          <div className="reports-results-header">
            <h4 style={{ margin: 0 }}>
              {reportList.length} aluno(s) encontrado(s)
            </h4>
            {reportList.length > 0 && (
              <div className="reports-export-actions">
                <button
                  type="button"
                  className="reports-export-btn reports-export-btn--pdf"
                  onClick={exportReportPDF}
                >
                  <i className="fas fa-file-pdf" /> Exportar PDF
                </button>
                <button
                  type="button"
                  className="reports-export-btn reports-export-btn--word"
                  onClick={exportReportWord}
                >
                  <i className="fas fa-file-word" /> Exportar Word
                </button>
              </div>
            )}
          </div>

          {reportList.length > 0 ? (
            <>
              <p className="table-scroll-hint">Deslize horizontalmente para ver todas as colunas.</p>
              <div className="table-wrapper reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Turma</th>
                    <th>Etiqueta</th>
                    <th>Nível de leitura</th>
                    <th>Nível de escrita</th>
                    {(reportNotasFilter === 'acima' || reportNotasFilter === 'abaixo') && (
                      <th>{reportNotasFilter === 'acima' ? 'Acima da média' : 'Abaixo da média'}</th>
                    )}
                    {reportFaltasFilter === 'sim' && (
                      <th>Faltas</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportList.map((a, i) => (
                    <tr key={a.id || i}>
                      <td>{a.nome || '-'}</td>
                      <td>{a.turma_nome || '-'}</td>
                      <td>
                        <span
                          className={`badge bg-${a.etiqueta_cor === 'vermelho' ? 'red' : a.etiqueta_cor === 'amarelo' ? 'yellow' : a.etiqueta_cor === 'verde' ? 'green' : a.etiqueta_cor === 'roxo' ? 'purple' : 'blue'}`}
                        >
                          {getEtiquetaLabel(a.etiqueta_cor)}
                        </span>
                      </td>
                      <td>{formatNivel(a.nivel_leitura) || '-'}</td>
                      <td>{formatNivel(a.nivel_escrita) || '-'}</td>
                      {(reportNotasFilter === 'acima' || reportNotasFilter === 'abaixo') && (
                        <td>{a.qtd_notas ?? 0}</td>
                      )}
                      {reportFaltasFilter === 'sim' && (
                        <td>{a.qtd_faltas ?? 0}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-light)', margin: 0 }}>
              Nenhum aluno encontrado com os filtros selecionados. Ajuste os critérios e tente novamente.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default ReportsView;
