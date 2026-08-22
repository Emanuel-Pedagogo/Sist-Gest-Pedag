import React, { useState } from 'react';
import BoletimView from '../BoletimView';
import StudentResumoTab from '../components/student/StudentResumoTab';
import { getEtiquetaLabel } from '../utils/etiquetas';
import { formatNivel, normalizeNivelKey } from '../utils/sondagemNiveis';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const NIVEL_ESCRITA_OPCOES_1_2 = [
  'PRÉ-SILÁBICO',
  'SILÁBICO SEM VALOR SONORO',
  'SILÁBICO COM VALOR SONORO',
  'SILÁBICO ALFABÉTICO',
  'ALFABÉTICO',
];
const NIVEL_LEITURA_OPCOES_1_2 = [
  'PRÉ – LEITOR 1',
  'PRÉ – LEITOR 2',
  'PRÉ – LEITOR 3',
  'PRÉ – LEITOR 4',
  'LEITOR INICIANTE',
  'LEITOR FLUENTE',
];

const NIVEL_ESCRITA_OPCOES_3_5 = [
  'ESCREVE PALAVRAS NÃO ORTOGRÁFICAS',
  'ESCREVE PALAVRAS ORTOGRÁFICAS',
  'ESCREVE FRASES NÃO COESAS',
  'ESCREVE FRASES COESAS',
  'ESCREVE TEXTOS NÃO COESOS',
  'ESCREVE TEXTOS COESOS',
];
const NIVEL_LEITURA_OPCOES_3_5 = [
  'PRÉ-LEITOR',
  'LEITOR DE PALAVRAS SEM FLUÊNCIA',
  'LEITOR DE PALAVRAS COM FLUÊNCIA',
  'LEITOR DE TEXTO SEM FLUÊNCIA',
  'LEITOR DE TEXTO COM FLUÊNCIA',
  'LEITOR COM FLUÊNCIA, RESPEITA RITMO, INTENSIDADE E ENTONAÇÃO',
];

const NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2 = [
  'Não Ortográfica',
  'Escreve Palavras Ortográficas',
  'Escreve Frases não Coesas',
  'Não Escreve Textos Coesos',
  'Escreve Textos Coesos',
];
const NIVEL_LEITURA_OPCOES_FUNDAMENTAL2 = [
  'Pré-Leitor',
  'Leitor de Palavras sem Fluência',
  'Leitor de Palavras com Fluência',
  'Leitor de Frases sem Fluência',
  'Leitor de Frases com Fluência',
  'Leitor de Texto sem Fluência',
  'Leitor de Texto com Fluência',
  'Leitor com Fluência, Respeita Ritmo, Intensidade e Entonação',
];

const navBtnStyle = (enabled) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  border: '1px solid #ddd',
  borderRadius: 8,
  background: 'white',
  color: enabled ? 'var(--primary)' : '#aaa',
  cursor: enabled ? 'pointer' : 'not-allowed',
  fontSize: '0.9em',
  fontWeight: 500,
  opacity: enabled ? 1 : 0.65,
});

const SondagemTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div style={{ background: 'white', padding: 10, border: '1px solid #ccc', borderRadius: 5 }}>
      <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
      {payload.map((p, index) => {
        const val =
          p.dataKey === 'nivelLeituraNum'
            ? p.payload?.nivelLeituraLabel
            : p.payload?.nivelEscritaLabel;
        return (
          <p key={index} style={{ margin: 0, color: p.color }}>
            {p.name}: {val || 'Não informado'}
          </p>
        );
      })}
    </div>
  );
};

const StudentDetailView = ({
  navigate,
  selectedClassId,
  studentNavIndex = -1,
  studentNavTotal = 0,
  canNavigateStudentPrev = false,
  canNavigateStudentNext = false,
  onNavigateStudentPrev,
  onNavigateStudentNext,
  selectedStudent,
  classes,
  getBadgeColorClass,
  currentTab,
  switchTab,
  setSelectedStudent,
  handleOpenOccurrenceModal,
  occurrencesLoading,
  occurrencesError,
  occurrences,
  handleDeleteOccurrence,
  handleOpenSondagemModal,
  sondagensLoading,
  sondagensError,
  sondagens,
  formatDate,
  openSondagemMidia,
  handleDeleteSondagem,
  uploadingDocument,
  selectedStudentId,
  handleUploadDocument,
  loadingDocuments,
  aeeDocuments,
  handleDownloadDocument,
  handleDeleteDocument,
  reavaliarCorAluno,
  isProfessor = false,
  escolaNome = '',
  anoLetivo = '',
  professorNome = '',
}) => {
  const [sondagemViewMode, setSondagemViewMode] = useState('chart');

  const getSondagemNivelSet = () => {
    if (!selectedStudent?.turma_id) return '1-2';
    const turma = (classes || []).find((c) => String(c.id) === String(selectedStudent.turma_id));
    if (!turma) return '1-2';
    const nome = (turma.nome || '').toLowerCase();
    const anoEscolar = turma.ano_escolar ?? turma.ano;
    const anos = Array.isArray(anoEscolar) ? anoEscolar : anoEscolar != null ? [anoEscolar] : [];
    const temAno69 = nome.match(/\b[6-9]º?\b/) || anos.some((a) => [6, 7, 8, 9].includes(Number(a)));
    if (temAno69) return '6-9';
    const temAno35 = nome.match(/\b[3-5]º?\b/) || anos.some((a) => [3, 4, 5].includes(Number(a)));
    if (temAno35) return '3-5';
    return '1-2';
  };

  const nivelSet = getSondagemNivelSet();
  const opcoesLeitura = nivelSet === '3-5' ? NIVEL_LEITURA_OPCOES_3_5 : nivelSet === '6-9' ? NIVEL_LEITURA_OPCOES_FUNDAMENTAL2 : NIVEL_LEITURA_OPCOES_1_2;
  const opcoesEscrita = nivelSet === '3-5' ? NIVEL_ESCRITA_OPCOES_3_5 : nivelSet === '6-9' ? NIVEL_ESCRITA_OPCOES_FUNDAMENTAL2 : NIVEL_ESCRITA_OPCOES_1_2;

  const chartData = [...(sondagens || [])]
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .map((s) => {
      // Matching normalizado: sondagens antigas com caixa/travessões diferentes continuam no gráfico
      const leituraKey = normalizeNivelKey(s.nivel_leitura);
      const escritaKey = normalizeNivelKey(s.nivel_escrita);
      const leituraIndex = opcoesLeitura.findIndex((o) => normalizeNivelKey(o) === leituraKey);
      const escritaIndex = opcoesEscrita.findIndex((o) => normalizeNivelKey(o) === escritaKey);
      return {
        ...s,
        dataFormatada: s.data ? formatDate(s.data) : '-',
        nivelLeituraNum: leituraIndex >= 0 ? leituraIndex : null,
        nivelEscritaNum: escritaIndex >= 0 ? escritaIndex : null,
        nivelLeituraLabel: formatNivel(leituraIndex >= 0 ? opcoesLeitura[leituraIndex] : s.nivel_leitura),
        nivelEscritaLabel: formatNivel(escritaIndex >= 0 ? opcoesEscrita[escritaIndex] : s.nivel_escrita),
      };
    });

  return (
    <section id="view-student-detail" className="view-section">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 15,
        }}
      >
        <button type="button" className="breadcrumb btn-unstyled" onClick={() => navigate(selectedClassId ? 'classes' : 'students')}>
          <i className="fas fa-arrow-left" /> Voltar para Lista
        </button>
        {studentNavTotal > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onNavigateStudentPrev}
              disabled={!canNavigateStudentPrev}
              style={navBtnStyle(canNavigateStudentPrev)}
              title="Aluno anterior na turma"
            >
              <i className="fas fa-chevron-left" />
              Anterior
            </button>
            <span style={{ fontSize: '0.9em', color: 'var(--text-light)', minWidth: 72, textAlign: 'center' }}>
              {studentNavIndex >= 0 ? `${studentNavIndex + 1} de ${studentNavTotal}` : `— de ${studentNavTotal}`}
            </span>
            <button
              type="button"
              onClick={onNavigateStudentNext}
              disabled={!canNavigateStudentNext}
              style={navBtnStyle(canNavigateStudentNext)}
              title="Próximo aluno na turma"
            >
              Próximo
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        )}
      </div>

      <div className="student-header">
        <div
          style={{
            width: 60,
            height: 60,
            background: selectedStudent?.etiqueta_cor === 'roxo' ? '#9c27b0' : '#ddd',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5em',
            color: selectedStudent?.etiqueta_cor === 'roxo' ? 'white' : '#666',
          }}
        >
          {selectedStudent?.etiqueta_cor === 'roxo' ? (
            <i className="fas fa-wheelchair" />
          ) : (
            <i className="fas fa-user" />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{selectedStudent?.nome || 'Nome não informado'}</h2>
          <span style={{ color: 'gray' }}>
            {classes.find((c) => String(c.id) === String(selectedStudent?.turma_id))?.nome || 'Turma não informada'}
            {selectedStudent?.matricula ? ` • Matrícula: ${selectedStudent.matricula}` : ''}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            className={`badge ${getBadgeColorClass(selectedStudent?.etiqueta_cor)}`}
            style={{ fontSize: '1em', padding: '8px 15px' }}
          >
            {getEtiquetaLabel(selectedStudent?.etiqueta_cor)}
          </span>
        </div>
      </div>

      <div className="student-tabs">
        <button
          type="button"
          className={`tab ${currentTab === 'resumo' ? 'active' : ''}`}
          onClick={() => switchTab('resumo')}
        >
          Resumo
        </button>
        {!isProfessor && (
          <button
            type="button"
            className={`tab ${currentTab === 'boletim' ? 'active' : ''}`}
            onClick={() => switchTab('boletim')}
          >
            Boletim
          </button>
        )}
        <button
          type="button"
          className={`tab ${currentTab === 'ocorrencias' ? 'active' : ''}`}
          onClick={() => switchTab('ocorrencias')}
        >
          Ocorrências
        </button>
        <button
          type="button"
          className={`tab ${currentTab === 'sondagem' ? 'active' : ''}`}
          onClick={() => switchTab('sondagem')}
        >
          Sondagens
        </button>
        <button
          type="button"
          className={`tab ${currentTab === 'evidencias' ? 'active' : ''}`}
          onClick={() => switchTab('evidencias')}
        >
          Evidências (Anexos)
        </button>
        {selectedStudent?.etiqueta_cor === 'roxo' && (
          <button
            type="button"
            className={`tab ${currentTab === 'aee' ? 'active' : ''}`}
            onClick={() => switchTab('aee')}
            style={{
              borderLeft: '3px solid #9c27b0',
              fontWeight: 'bold',
            }}
          >
            AEE 🟣
          </button>
        )}
      </div>

      {/* Tab Boletim (coordenação apenas — professor lança notas na aba "Notas" da turma) */}
      {!isProfessor && currentTab === 'boletim' && selectedStudent?.id && (
        <div id="tab-boletim" className="tab-content active">
          <BoletimView
            alunoId={selectedStudent.id}
            turmaNome={classes.find((c) => String(c.id) === String(selectedStudent?.turma_id))?.nome || ''}
            alunoNome={selectedStudent?.nome || ''}
            alunoMatricula={selectedStudent?.matricula != null ? String(selectedStudent.matricula) : ''}
            onEtiquetaAtualizada={(novaCor) => {
              setSelectedStudent((prev) => (prev ? { ...prev, etiqueta_cor: novaCor } : null));
            }}
            reavaliarCorAluno={reavaliarCorAluno}
          />
        </div>
      )}

      {/* Tab Resumo */}
      {currentTab === 'resumo' && (
        <div id="tab-resumo" className="tab-content active">
          <StudentResumoTab
            selectedStudent={selectedStudent}
            turmaNome={classes.find((c) => String(c.id) === String(selectedStudent?.turma_id))?.nome}
            occurrences={occurrences}
            occurrencesLoading={occurrencesLoading}
            occurrencesError={occurrencesError}
            sondagens={sondagens}
            sondagensLoading={sondagensLoading}
            formatDate={formatDate}
            switchTab={switchTab}
            isProfessor={isProfessor}
            escolaNome={escolaNome}
            anoLetivo={anoLetivo}
            professorNome={professorNome}
          />
        </div>
      )}

      {/* Tab Ocorrências */}
      {currentTab === 'ocorrencias' && (
        <div id="tab-ocorrencias" className="tab-content active">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: 0 }}>Ocorrências</h3>
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              onClick={() => handleOpenOccurrenceModal()}
            >
              <i className="fas fa-plus" style={{ marginRight: 5 }} />
              Nova Ocorrência
            </button>
          </div>
          {occurrencesLoading && (
            <div className="list-item" style={{ marginTop: 15 }}>
              <span>Carregando ocorrências...</span>
            </div>
          )}
          {occurrencesError && (
            <div className="list-item" style={{ marginTop: 15 }}>
              <span>{occurrencesError}</span>
            </div>
          )}
          {!occurrencesLoading && !occurrencesError && occurrences.length === 0 && (
            <div className="list-item" style={{ marginTop: 15 }}>
              <span>Nenhuma ocorrência registrada.</span>
            </div>
          )}
          {!occurrencesLoading && !occurrencesError && occurrences.length > 0 && (
            <div className="cards-grid" style={{ marginTop: 15 }}>
              {occurrences.map((ocorrencia) => (
                <div key={ocorrencia.id} className="card">
                  <div style={{ marginBottom: 10 }}>
                    <strong style={{ fontSize: '1.1em', color: 'var(--primary)' }}>
                      {ocorrencia.titulo || 'Sem título'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.9em', color: 'var(--text-light)', marginBottom: 10 }}>
                    <i className="fas fa-calendar" style={{ marginRight: 5 }} />
                    {ocorrencia.data_ocorrencia
                      ? (() => {
                          const d = ocorrencia.data_ocorrencia;
                          if (!d) return 'Data não informada';
                          const [y, m, day] = d.split('-');
                          return `${day}/${m}/${y}`;
                        })()
                      : 'Data não informada'}
                  </div>
                  <div style={{ fontSize: '0.9em', color: 'var(--text)', lineHeight: '1.5', marginBottom: 12 }}>
                    {ocorrencia.descricao || 'Sem descrição'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenOccurrenceModal(ocorrencia)}
                      style={{
                        padding: '6px 14px',
                        border: '1px solid #0d6efd',
                        borderRadius: 6,
                        background: 'white',
                        color: '#0d6efd',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOccurrence(ocorrencia)}
                      style={{
                        padding: '6px 14px',
                        border: '1px solid #dc3545',
                        borderRadius: 6,
                        background: 'white',
                        color: '#dc3545',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Sondagem */}
      {currentTab === 'sondagem' && (
        <div id="tab-sondagem" className="tab-content active">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <h3 style={{ margin: 0 }}>Sondagens</h3>
              <div style={{ display: 'flex', background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setSondagemViewMode('chart')}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    background: sondagemViewMode === 'chart' ? 'var(--primary)' : 'transparent',
                    color: sondagemViewMode === 'chart' ? 'white' : '#666',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: sondagemViewMode === 'chart' ? 'bold' : 'normal',
                  }}
                >
                  <i className="fas fa-chart-line" style={{ marginRight: 5 }} /> Gráfico
                </button>
                <button
                  type="button"
                  onClick={() => setSondagemViewMode('list')}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    background: sondagemViewMode === 'list' ? 'var(--primary)' : 'transparent',
                    color: sondagemViewMode === 'list' ? 'white' : '#666',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: sondagemViewMode === 'list' ? 'bold' : 'normal',
                  }}
                >
                  <i className="fas fa-list" style={{ marginRight: 5 }} /> Lista
                </button>
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto' }}
              onClick={() => handleOpenSondagemModal()}
            >
              + Nova sondagem
            </button>
          </div>
          {sondagensLoading && (
            <p style={{ marginTop: 15, color: 'var(--text)' }}>Carregando sondagens...</p>
          )}
          {sondagensError && (
            <p style={{ marginTop: 15, color: 'var(--danger)' }}>{sondagensError}</p>
          )}
          {!sondagensLoading && !sondagensError && sondagemViewMode === 'chart' && (
            <div style={{ marginTop: 20, background: 'white', padding: 20, borderRadius: 8, border: '1px solid #eee' }}>
              {chartData.length < 2 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                  <i className="fas fa-chart-line" style={{ fontSize: '3em', color: '#ddd', marginBottom: 15 }} />
                  <p>Adicione pelo menos duas sondagens para visualizar a evolução no gráfico.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'stretch' }}>
                  {/* Gráfico de Leitura */}
                  <div style={{ flex: '1 1 320px', minWidth: 280, height: 380 }}>
                    <h4 style={{ textAlign: 'center', color: '#0d6efd', marginBottom: 15, marginTop: 0 }}>Evolução - Nível de Leitura</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="dataFormatada" tick={{ fontSize: 12 }} />
                        <YAxis 
                          domain={[0, opcoesLeitura.length - 1]}
                          ticks={opcoesLeitura.map((_, i) => i)}
                          tickFormatter={(value) => {
                            const text = opcoesLeitura[value] || '';
                            return text.length > 18 ? text.substring(0, 18) + '...' : text;
                          }}
                          width={130}
                          tick={{ fontSize: 10, fill: '#0d6efd' }}
                        />
                        <Tooltip content={<SondagemTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="nivelLeituraNum" 
                          name="Nível de Leitura" 
                          stroke="#0d6efd" 
                          strokeWidth={3}
                          activeDot={{ r: 8 }} 
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Gráfico de Escrita */}
                  <div style={{ flex: '1 1 320px', minWidth: 280, height: 380 }}>
                    <h4 style={{ textAlign: 'center', color: '#198754', marginBottom: 15, marginTop: 0 }}>Evolução - Nível de Escrita</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="dataFormatada" tick={{ fontSize: 12 }} />
                        <YAxis 
                          domain={[0, opcoesEscrita.length - 1]}
                          ticks={opcoesEscrita.map((_, i) => i)}
                          tickFormatter={(value) => {
                            const text = opcoesEscrita[value] || '';
                            return text.length > 18 ? text.substring(0, 18) + '...' : text;
                          }}
                          width={130}
                          tick={{ fontSize: 10, fill: '#198754' }}
                        />
                        <Tooltip content={<SondagemTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="nivelEscritaNum" 
                          name="Nível de Escrita" 
                          stroke="#198754" 
                          strokeWidth={3}
                          activeDot={{ r: 8 }} 
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
          {!sondagensLoading && !sondagensError && sondagemViewMode === 'list' && (
            <table
              style={{
                width: '100%',
                marginTop: 15,
                borderCollapse: 'collapse',
                background: 'white',
              }}
            >
              <thead>
                <tr style={{ background: '#eee', textAlign: 'left' }}>
                  <th style={{ padding: 10 }}>Data</th>
                  <th style={{ padding: 10 }}>Nível de leitura</th>
                  <th style={{ padding: 10 }}>Nível de escrita</th>
                  <th style={{ padding: 10, width: 180 }}>Anexos</th>
                  <th style={{ padding: 10, width: 100 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sondagens.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 15, color: '#666' }}>
                      Nenhuma sondagem cadastrada. Clique em &quot;+ Nova sondagem&quot; para adicionar.
                    </td>
                  </tr>
                ) : (
                  sondagens.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 10 }}>
                        {s.data ? formatDate(s.data) : '-'}
                      </td>
                      <td style={{ padding: 10 }}>{formatNivel(s.nivel_leitura) || '-'}</td>
                      <td style={{ padding: 10 }}>{formatNivel(s.nivel_escrita) || '-'}</td>
                      <td style={{ padding: 10 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {s.foto_escrita_url ? (
                            <button
                              type="button"
                              onClick={() => openSondagemMidia('foto', s.foto_escrita_url)}
                              style={{
                                padding: '4px 8px',
                                border: '1px solid #0d6efd',
                                borderRadius: 6,
                                background: 'white',
                                color: '#0d6efd',
                                cursor: 'pointer',
                                fontSize: 11,
                              }}
                              title="Ver foto da escrita"
                            >
                              📷 Foto
                            </button>
                          ) : null}
                          {s.audio_leitura_url ? (
                            <button
                              type="button"
                              onClick={() => openSondagemMidia('audio', s.audio_leitura_url)}
                              style={{
                                padding: '4px 8px',
                                border: '1px solid #198754',
                                borderRadius: 6,
                                background: 'white',
                                color: '#198754',
                                cursor: 'pointer',
                                fontSize: 11,
                              }}
                              title="Ouvir áudio da leitura"
                            >
                              🎧 Áudio
                            </button>
                          ) : null}
                          {s.arquivo_url ? (
                            <a
                              href={s.arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '4px 8px',
                                border: '1px solid #6c757d',
                                borderRadius: 6,
                                background: 'white',
                                color: '#6c757d',
                                textDecoration: 'none',
                                fontSize: 11,
                                display: 'inline-block',
                              }}
                              title="Abrir arquivo"
                            >
                              📄 Arquivo
                            </a>
                          ) : null}
                          {!s.foto_escrita_url && !s.audio_leitura_url && !s.arquivo_url && (
                            <span style={{ fontSize: 11, color: '#999' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenSondagemModal(s)}
                          style={{
                            marginRight: 8,
                            padding: '4px 10px',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSondagem(s)}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid #dc3545',
                            borderRadius: 6,
                            background: 'white',
                            color: '#dc3545',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab Evidências */}
      {currentTab === 'evidencias' && (
        <div id="tab-evidencias" className="tab-content active">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3>Portfólio Digital</h3>
            <button className="btn-primary" style={{ width: 'auto' }}>
              + Upload
            </button>
          </div>
          <div
            style={{
              marginTop: 15,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 15,
            }}
          >
            <div
              style={{
                background: 'white',
                padding: 10,
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <i
                className="fas fa-image"
                style={{
                  fontSize: '2em',
                  color: 'var(--accent)',
                  marginBottom: 10,
                }}
              />
              <p>Foto_Atividade.jpg</p>
              <small>15/05/2024</small>
            </div>
            <div
              style={{
                background: 'white',
                padding: 10,
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <i
                className="fas fa-microphone"
                style={{
                  fontSize: '2em',
                  color: 'var(--warning)',
                  marginBottom: 10,
                }}
              />
              <p>Leitura_Audio.mp3</p>
              <small>10/05/2024</small>
            </div>
          </div>
        </div>
      )}

      {/* Tab AEE */}
      {currentTab === 'aee' && (
        <div id="tab-aee" className="tab-content active">
          <h3>Atendimento Educacional Especializado (AEE)</h3>
          {selectedStudent?.etiqueta_cor === 'roxo' && (
            <div style={{ 
              padding: 10, 
              background: '#f3e5f5', 
              borderRadius: 6, 
              marginBottom: 20,
              border: '1px solid #9c27b0'
            }}>
              <strong style={{ color: '#9c27b0' }}>Aluno com Educação Especial</strong>
              {selectedStudent?.aee_deficiencia && (
                <div style={{ marginTop: 5 }}>
                  <strong>Deficiência/Condição:</strong> {selectedStudent.aee_deficiencia}
                  {selectedStudent?.aee_cid && <> • <strong>CID:</strong> {selectedStudent.aee_cid}</>}
                </div>
              )}
            </div>
          )}
          <div style={{ maxWidth: 800 }}>
            <div style={{ padding: 20, background: '#f9f9f9', borderRadius: 8, border: '1px solid #ddd' }}>
              <h4 style={{ marginBottom: 15, color: 'var(--primary)' }}>
                Documentos Anexados (Laudos/Planos)
              </h4>
              
              <div style={{ marginBottom: 15 }}>
                <label
                  htmlFor="aee-document-upload"
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    background: 'var(--primary)',
                    color: 'white',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: '0.9em',
                  }}
                >
                  <i className="fas fa-upload" style={{ marginRight: 8 }} />
                  {uploadingDocument ? 'Fazendo upload...' : 'Enviar Documento'}
                </label>
                <input
                  id="aee-document-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,image/*,application/pdf"
                  onChange={handleUploadDocument}
                  disabled={uploadingDocument || !selectedStudentId}
                  style={{ display: 'none' }}
                />
                <span style={{ marginLeft: 10, fontSize: '0.85em', color: '#666' }}>
                  PDF ou Imagens
                </span>
              </div>

              {loadingDocuments ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                  Carregando documentos...
                </div>
              ) : aeeDocuments.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                  Nenhum documento anexado ainda.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {aeeDocuments.map((doc) => (
                    <div
                      key={doc.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 15,
                        padding: 12,
                        background: 'white',
                        borderRadius: 6,
                        border: '1px solid #ddd',
                      }}
                    >
                      <i
                        className={`fas ${
                          doc.name.toLowerCase().endsWith('.pdf')
                            ? 'fa-file-pdf'
                            : 'fa-file-image'
                        }`}
                        style={{
                          fontSize: '1.5em',
                          color: doc.name.toLowerCase().endsWith('.pdf') ? '#dc3545' : '#3498db',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9em' }}>{doc.name}</div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>
                          {doc.created_at
                            ? new Date(doc.created_at).toLocaleDateString('pt-BR')
                            : 'Data não disponível'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleDownloadDocument(doc.name)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.85em',
                          }}
                          title="Baixar/Visualizar"
                        >
                          <i className="fas fa-download" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.name)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--danger)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.85em',
                          }}
                          title="Excluir"
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default StudentDetailView;
