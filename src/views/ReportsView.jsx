import React from 'react';

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
    <div id="view-reports" className="view-section">
      <h2>Relatórios e Listas</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 20 }}>
        Gere listas de alunos por escola, turma, etiqueta ou nível de leitura e exporte em PDF ou Word.
      </p>

      <div
        style={{
          background: 'white',
          padding: 24,
          borderRadius: 12,
          marginBottom: 20,
          border: '1px solid #eee',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {/* Linha 1: Escola, Ano e Turmas na mesma linha */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="input-group" style={{ minWidth: 180, marginBottom: 0 }}>
            <div style={{ minHeight: 24, display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#222' }}>Escola</label>
            </div>
            <select
              value={reportSchoolId}
              onChange={(e) => {
                setReportSchoolId(e.target.value);
                setReportGradeLevels(null);
              }}
              style={{ width: '100%', padding: '9px 10px', height: 38, borderRadius: 6, border: '1px solid #ddd' }}
            >
              <option value="">Todas as escolas</option>
              {(schools || []).map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div className="input-group" style={{ width: 85, flexShrink: 0, marginBottom: 0 }}>
            <div style={{ minHeight: 24, display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#222' }}>Ano letivo</label>
            </div>
            <select
              value={reportYear}
              onChange={(e) => {
                setReportYear(Number(e.target.value));
                setReportGradeLevels(null);
              }}
              style={{ width: '100%', padding: '9px 10px', height: 38, borderRadius: 6, border: '1px solid #ddd' }}
            >
              {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i + 1).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="input-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
            <div style={{ minHeight: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#222' }}>
                Turma(s)
                <span style={{ fontWeight: 400, color: '#666', marginLeft: 6 }}>
                  ({reportGradeLevels === null ? 'Todas' : reportGradeLevels.length === 0 ? 'Nenhuma' : reportGradeLevels.length + ' sel.'})
                </span>
              </label>
              {reportClasses.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setReportGradeLevels(null)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '2px 8px',
                      height: 24,
                      lineHeight: 1.2,
                      cursor: 'pointer',
                      border: '1px solid #0d6efd',
                      borderRadius: 4,
                      background: 'white',
                      color: '#0d6efd',
                    }}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportGradeLevels([])}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '2px 8px',
                      height: 24,
                      lineHeight: 1.2,
                      cursor: 'pointer',
                      border: '1px solid #6c757d',
                      borderRadius: 4,
                      background: 'white',
                      color: '#6c757d',
                    }}
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: 4,
                minHeight: 38,
                background: '#fafafa',
                display: 'flex',
                flexWrap: 'nowrap',
                gap: 2,
                alignItems: 'center',
                flex: 1,
                minWidth: 0,
              }}
            >
              {reportClasses.length === 0 ? (
                <span style={{ color: '#999', fontSize: 12 }}>Carregando...</span>
              ) : (
                reportAvailableGrades.map((grade) => (
                  <label
                    key={grade}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: 4,
                      background: (reportGradeLevels === null || reportGradeLevels.includes(grade)) ? 'rgba(13, 110, 253, 0.08)' : 'transparent',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#333',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={reportGradeLevels === null || reportGradeLevels.includes(grade)}
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
                      style={{ width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span>{grade}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Linha 2: Etiqueta, Nível de leitura, Notas, Faltas, Gerar lista - tudo na mesma linha */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(100px, 1fr) minmax(140px, 1.5fr) minmax(100px, 1fr) minmax(90px, 1fr) auto',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          <div className="input-group" style={{ minWidth: 0 }}>
            <label style={{ margin: 0, marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>Etiqueta</label>
            <select
              value={reportEtiqueta}
              onChange={(e) => setReportEtiqueta(e.target.value)}
              style={{ width: '100%', padding: '9px 10px', height: 38, borderRadius: 6, border: '1px solid #ddd' }}
            >
              <option value="">Todas</option>
              <option value="azul">Regular</option>
              <option value="verde">Avançado</option>
              <option value="amarelo">Atenção</option>
              <option value="vermelho">Prioridade</option>
              <option value="roxo">AEE</option>
            </select>
          </div>
          <div className="input-group" style={{ minWidth: 0 }}>
            <label style={{ margin: 0, marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>Nível de leitura</label>
            <select
              value={reportNivelLeitura}
              onChange={(e) => setReportNivelLeitura(e.target.value)}
              style={{ width: '100%', padding: '9px 10px', height: 38, borderRadius: 6, border: '1px solid #ddd' }}
            >
              <option value="">Qualquer</option>
              <optgroup label="1º e 2º ano">
                <option value="PRÉ – LEITOR 1">PRÉ – LEITOR 1</option>
                <option value="PRÉ – LEITOR 2">PRÉ – LEITOR 2</option>
                <option value="PRÉ – LEITOR 3">PRÉ – LEITOR 3</option>
                <option value="PRÉ – LEITOR 4">PRÉ – LEITOR 4</option>
                <option value="LEITOR INICIANTE">LEITOR INICIANTE</option>
                <option value="LEITOR FLUENTE">LEITOR FLUENTE</option>
              </optgroup>
              <optgroup label="3º ao 5º ano">
                <option value="PRÉ-LEITOR">PRÉ-LEITOR</option>
                <option value="LEITOR DE PALAVRAS SEM FLUÊNCIA">LEITOR DE PALAVRAS SEM FLUÊNCIA</option>
                <option value="LEITOR DE PALAVRAS COM FLUÊNCIA">LEITOR DE PALAVRAS COM FLUÊNCIA</option>
                <option value="LEITOR DE TEXTO SEM FLUÊNCIA">LEITOR DE TEXTO SEM FLUÊNCIA</option>
                <option value="LEITOR DE TEXTO COM FLUÊNCIA">LEITOR DE TEXTO COM FLUÊNCIA</option>
                <option value="LEITOR COM FLUÊNCIA, RESPEITA RITMO, INTENSIDADE E ENTONAÇÃO">LEITOR COM FLUÊNCIA, RESPEITA RITMO, INTENSIDADE E ENTONAÇÃO</option>
              </optgroup>
              <optgroup label="6º ao 9º ano">
                <option value="Pré-Leitor">Pré-Leitor</option>
                <option value="Leitor de Palavras sem Fluência">Leitor de Palavras sem Fluência</option>
                <option value="Leitor de Palavras com Fluência">Leitor de Palavras com Fluência</option>
                <option value="Leitor de Frases sem Fluência">Leitor de Frases sem Fluência</option>
                <option value="Leitor de Frases com Fluência">Leitor de Frases com Fluência</option>
                <option value="Leitor de Texto sem Fluência">Leitor de Texto sem Fluência</option>
                <option value="Leitor de Texto com Fluência">Leitor de Texto com Fluência</option>
                <option value="Leitor com Fluência, Respeita Ritmo, Intensidade e Entonação">Leitor com Fluência, Respeita Ritmo, Intensidade e Entonação</option>
              </optgroup>
            </select>
          </div>
          <div className="input-group" style={{ minWidth: 0 }}>
            <label style={{ margin: 0, marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>Notas</label>
            <select
              value={reportNotasFilter}
              onChange={(e) => setReportNotasFilter(e.target.value)}
              style={{ width: '100%', padding: '9px 10px', height: 38, borderRadius: 6, border: '1px solid #ddd' }}
            >
              <option value="nao">Não mostrar notas</option>
              <option value="acima">Acima da média (≥5)</option>
              <option value="abaixo">Abaixo da média (&lt;5)</option>
            </select>
          </div>
          <div className="input-group" style={{ minWidth: 0 }}>
            <label style={{ margin: 0, marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>Faltas</label>
            <select
              value={reportFaltasFilter}
              onChange={(e) => setReportFaltasFilter(e.target.value)}
              style={{ width: '100%', padding: '9px 10px', height: 38, borderRadius: 6, border: '1px solid #ddd' }}
            >
              <option value="nao">Não mostrar faltas</option>
              <option value="sim">Mostrar faltas</option>
            </select>
          </div>
          <div className="input-group" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <label style={{ margin: 0, marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222', visibility: 'hidden', height: 20 }}>—</label>
            <button
              type="button"
              className="btn-primary"
              onClick={handleGenerateReport}
              disabled={reportLoading}
              style={{ padding: '9px 24px', height: 38 }}
            >
              {reportLoading ? 'Gerando...' : 'Gerar lista'}
            </button>
          </div>
        </div>
      </div>

      {reportGenerated && (
        <div
          style={{
            background: 'white',
            padding: 24,
            borderRadius: 12,
            border: '1px solid #eee',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h4 style={{ margin: 0 }}>
              {reportList.length} aluno(s) encontrado(s)
            </h4>
            {reportList.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={exportReportPDF}
                  style={{
                    padding: '10px 18px',
                    border: '1px solid #dc3545',
                    borderRadius: 6,
                    background: 'white',
                    color: '#dc3545',
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <i className="fas fa-file-pdf" /> Exportar PDF
                </button>
                <button
                  type="button"
                  onClick={exportReportWord}
                  style={{
                    padding: '10px 18px',
                    border: '1px solid #0d6efd',
                    borderRadius: 6,
                    background: 'white',
                    color: '#0d6efd',
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <i className="fas fa-file-word" /> Exportar Word
                </button>
              </div>
            )}
          </div>

          {reportList.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: 12, textAlign: 'left' }}>Nome</th>
                    <th style={{ padding: 12, textAlign: 'left' }}>Turma</th>
                    <th style={{ padding: 12, textAlign: 'left' }}>Etiqueta</th>
                    <th style={{ padding: 12, textAlign: 'left' }}>Nível Leitura</th>
                    <th style={{ padding: 12, textAlign: 'left' }}>Nível Escrita</th>
                    {(reportNotasFilter === 'acima' || reportNotasFilter === 'abaixo') && (
                      <th style={{ padding: 12, textAlign: 'left' }}>{reportNotasFilter === 'acima' ? 'Acima da média' : 'Abaixo da média'}</th>
                    )}
                    {reportFaltasFilter === 'sim' && (
                      <th style={{ padding: 12, textAlign: 'left' }}>Faltas</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportList.map((a, i) => (
                    <tr key={a.id || i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 10 }}>{a.nome || '-'}</td>
                      <td style={{ padding: 10 }}>{a.turma_nome || '-'}</td>
                      <td style={{ padding: 10 }}>
                        <span
                          className={`badge bg-${a.etiqueta_cor === 'vermelho' ? 'red' : a.etiqueta_cor === 'amarelo' ? 'yellow' : a.etiqueta_cor === 'verde' ? 'green' : a.etiqueta_cor === 'roxo' ? 'purple' : 'blue'}`}
                        >
                          {getEtiquetaLabel(a.etiqueta_cor)}
                        </span>
                      </td>
                      <td style={{ padding: 10 }}>{a.nivel_leitura || '-'}</td>
                      <td style={{ padding: 10 }}>{a.nivel_escrita || '-'}</td>
                      {(reportNotasFilter === 'acima' || reportNotasFilter === 'abaixo') && (
                        <td style={{ padding: 10 }}>{a.qtd_notas ?? 0}</td>
                      )}
                      {reportFaltasFilter === 'sim' && (
                        <td style={{ padding: 10 }}>{a.qtd_faltas ?? 0}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-light)', margin: 0 }}>
              Nenhum aluno encontrado com os filtros selecionados. Ajuste os critérios e tente novamente.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsView;
