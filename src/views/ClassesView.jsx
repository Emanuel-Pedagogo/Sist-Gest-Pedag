import React, { useState } from 'react';
import ImportarListaAlunos from '../ImportarListaAlunos';
import ImportarSondagemFoto from '../ImportarSondagemFoto';
import ClassDashboardView from './ClassDashboardView';

const ClassesView = ({
  selectedClassId,
  selectedClassName,
  setSelectedClassId,
  setSelectedClassName,
  clearPersistedTurmaNav,
  setEditingStudent,
  setStudentFormData,
  setAeeFormData,
  setShowStudentModal,
  studentSearchTerm,
  setStudentSearchTerm,
  filterStudentEtiquetaCor,
  setFilterStudentEtiquetaCor,
  studentsLoading,
  studentsError,
  sortedFilteredStudents,
  students,
  selectStudent,
  getBadgeColorClass,
  handleEditStudent,
  handleDeleteStudent,
  activeSchool,
  activeSchoolId,
  selectedYear,
  setEditingClass,
  setClassFormData,
  setShowClassModal,
  classSearchTerm,
  setClassSearchTerm,
  classesLoading,
  classesError,
  filteredClassesSorted,
  classesList,
  schools,
  turmaEtiquetasCount,
  selectClass,
  handleEditClass,
  handleDeleteClass,
  onListaAlunosImportada,
  onSondagensImportadas,
  reavaliarCorAluno,
}) => {
  const [showImportLista, setShowImportLista] = useState(false);
  const [showImportSondagem, setShowImportSondagem] = useState(false);
  const [showEditAlunoPicker, setShowEditAlunoPicker] = useState(false);
  const [alunoParaEditarId, setAlunoParaEditarId] = useState('');
  const [activeTab, setActiveTab] = useState('alunos');

  const alunosOrdenados = [...(students || [])].sort((a, b) =>
    String(a.nome || '').localeCompare(String(b.nome || ''), 'pt', { sensitivity: 'base' }),
  );

  const turmaAtual = (classesList || []).find((c) => String(c.id) === String(selectedClassId));

  return (
    <div id="view-classes" className="view-section">
      {selectedClassId ? (
        <React.Fragment key="alunos-da-turma">
          {/* Linha 1: Voltar | Turma | Importar lista | Editar aluno | Novo Aluno */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 15,
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedClassId(null);
                setSelectedClassName('');
                clearPersistedTurmaNav();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                border: '2px solid var(--primary)',
                borderRadius: 8,
                background: 'white',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <i className="fas fa-arrow-left" />
              Voltar para lista de turmas
            </button>
            <h2 style={{ margin: 0, fontSize: '1.35rem', flex: 1, textAlign: 'center' }}>
              {selectedClassName}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: showImportLista ? '#f3f4f6' : 'white',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setShowImportSondagem(false);
                  setShowImportLista((v) => !v);
                }}
              >
                <i className="fas fa-file-upload" style={{ color: 'var(--primary)' }} />
                Importar lista
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  border: '1px solid #c4b5fd',
                  borderRadius: 8,
                  background: showImportSondagem ? '#ede9fe' : 'white',
                  color: '#5b21b6',
                  fontWeight: 600,
                  cursor: students.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: students.length === 0 ? 0.6 : 1,
                }}
                disabled={students.length === 0}
                onClick={() => {
                  setShowImportLista(false);
                  setShowImportSondagem((v) => !v);
                }}
                title="Foto da ficha de sondagem (Gemini)"
              >
                <i className="fas fa-camera" />
                Importar sondagens (IA)
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: 'white',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: students.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: students.length === 0 ? 0.6 : 1,
                }}
                disabled={students.length === 0}
                onClick={() => {
                  setAlunoParaEditarId('');
                  setShowEditAlunoPicker(true);
                }}
              >
                <i className="fas fa-user-edit" style={{ color: 'var(--accent)' }} />
                Editar aluno
              </button>
              <button
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px' }}
                onClick={() => {
                  setEditingStudent(null);
                  setStudentFormData({
                    nome: '',
                    data_nascimento: '',
                    turma_id: selectedClassId,
                    etiqueta_cor: 'azul',
                    matricula: '',
                    nome_responsavel: '',
                    contato: '',
                    aee_deficiencia: '',
                    aee_cid: '',
                    motivo_etiqueta: '',
                  });
                  setAeeFormData({ aee_tem_laudo: false, aee_mediadora: '', aee_plano_individual: '' });
                  setShowStudentModal(true);
                }}
              >
                <i className="fas fa-plus" style={{ marginRight: 5 }} />
                Novo Aluno
              </button>
            </div>
          </div>

          <div className="student-tabs" style={{ marginBottom: 20 }}>
            <button
              className={`tab ${activeTab === 'alunos' ? 'active' : ''}`}
              onClick={() => setActiveTab('alunos')}
            >
              Lista de Alunos
            </button>
            <button
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard da Turma
            </button>
          </div>

          {activeTab === 'dashboard' && (
            <ClassDashboardView
              classId={selectedClassId}
              className={selectedClassName}
              students={students}
            />
          )}

          {activeTab === 'alunos' && (
            <>
              {showImportLista && (
            <ImportarListaAlunos
              turmaId={selectedClassId}
              onImportComplete={() => {
                setShowImportLista(false);
                if (onListaAlunosImportada) onListaAlunosImportada();
              }}
            />
          )}

          {showImportSondagem && (
            <ImportarSondagemFoto
              turmaId={selectedClassId}
              turma={turmaAtual}
              students={students}
              reavaliarCorAluno={reavaliarCorAluno}
              onImportComplete={() => {
                setShowImportSondagem(false);
                if (onSondagensImportadas) onSondagensImportadas();
              }}
            />
          )}

          {showEditAlunoPicker && (
            <div
              role="presentation"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 1900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
              onClick={() => setShowEditAlunoPicker(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 24,
                  maxWidth: 440,
                  width: '100%',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>Editar aluno</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#666' }}>
                  Escolha o aluno da turma <strong>{selectedClassName}</strong> para abrir o formulário de edição.
                </p>
                <select
                  value={alunoParaEditarId}
                  onChange={(e) => setAlunoParaEditarId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    fontSize: 15,
                    marginBottom: 16,
                  }}
                >
                  <option value="">Selecione o aluno...</option>
                  {alunosOrdenados.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.nome}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    style={{
                      padding: '10px 16px',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      background: 'white',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowEditAlunoPicker(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '10px 18px' }}
                    disabled={!alunoParaEditarId}
                    onClick={() => {
                      const aluno = students.find((s) => String(s.id) === alunoParaEditarId);
                      if (aluno) {
                        handleEditStudent(aluno);
                        setShowEditAlunoPicker(false);
                        setAlunoParaEditarId('');
                      }
                    }}
                  >
                    Abrir edição
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Linha 2: Buscar nome (esquerda) | Seletor Cor (mesma linha) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'flex-end',
              marginBottom: 20,
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="text"
                placeholder="Digite o nome..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                }}
              />
            </div>
            <div style={{ minWidth: 160 }}>
              <select
                value={filterStudentEtiquetaCor}
                onChange={(e) => setFilterStudentEtiquetaCor(e.target.value || '')}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  background: 'white',
                  fontSize: '0.9em',
                }}
              >
                <option value="">Todas as cores</option>
                <option value="verde">Verde</option>
                <option value="amarelo">Amarelo</option>
                <option value="vermelho">Vermelho</option>
                <option value="roxo">Roxo</option>
                <option value="azul">Azul</option>
              </select>
            </div>
          </div>
          <div className="list-container">
            {studentsLoading && (
              <div className="list-item">
                <span>Carregando alunos...</span>
              </div>
            )}
            {studentsError && (
              <div className="list-item">
                <span>{studentsError}</span>
              </div>
            )}
            {!studentsLoading && !studentsError && sortedFilteredStudents.length === 0 && students.length > 0 && (
              <div className="list-item">
                <span>Nenhum aluno encontrado com os filtros aplicados.</span>
              </div>
            )}
            {!studentsLoading && !studentsError && students.length === 0 && (
              <div className="list-item">
                <span>Nenhum aluno nesta turma.</span>
              </div>
            )}
            {!studentsLoading &&
              !studentsError &&
              sortedFilteredStudents.map((aluno) => {
                const badgeClass = getBadgeColorClass(aluno.etiqueta_cor);
                return (
                  <div
                    key={aluno.id}
                    className="list-item"
                    style={{
                      borderLeft: aluno.etiqueta_cor === 'roxo' ? '4px solid #9c27b0' : undefined,
                      paddingLeft: aluno.etiqueta_cor === 'roxo' ? '12px' : undefined,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
                      onClick={() => selectStudent(aluno)}
                    >
                      {aluno.etiqueta_cor === 'roxo' ? (
                        <i className="fas fa-wheelchair" style={{ color: '#9c27b0', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Educação Especial" />
                      ) : aluno.etiqueta_cor === 'vermelho' ? (
                        <i className="fas fa-exclamation-triangle" style={{ color: '#dc3545', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Prioridade" />
                      ) : aluno.etiqueta_cor === 'amarelo' ? (
                        <i className="fas fa-exclamation-circle" style={{ color: '#ffc107', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Atenção" />
                      ) : aluno.etiqueta_cor === 'verde' ? (
                        <i className="fas fa-star" style={{ color: '#28a745', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Avançado" />
                      ) : (
                        <i className="fas fa-user" style={{ color: '#007bff', fontSize: '1.2em', width: 24, textAlign: 'center' }} title="Regular" />
                      )}
                      <div>
                        <strong>{aluno.nome}</strong>
                        <div style={{ fontSize: '0.8em', color: 'gray' }}>
                          Frequência: {aluno.frequencia != null ? `${aluno.frequencia}%` : 'N/D'} • Nível de leitura: {aluno.nivel_leitura || 'Não informado'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className={`badge ${badgeClass}`}>
                        {aluno.etiqueta_cor === 'vermelho' ? 'Prioridade' : aluno.etiqueta_cor === 'amarelo' ? 'Atenção' : aluno.etiqueta_cor === 'verde' ? 'Avançado' : aluno.etiqueta_cor === 'roxo' ? 'Educação Especial' : 'Regular'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStudent(aluno);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'var(--accent)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        <i className="fas fa-edit" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStudent(aluno.id);
                        }}
                        style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
            </>
          )}
        </React.Fragment>
      ) : (
        <React.Fragment key="lista-turmas">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 15,
            }}
          >
            <h2 style={{ margin: 0 }}>
              Turmas {(activeSchool && activeSchool.nome) ? `- ${activeSchool.nome}` : ''}
            </h2>
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              onClick={() => {
                setEditingClass(null);
                setClassFormData({
                  nome: '',
                  ano: '',
                  codigo: '',
                  professor_regente: '',
                  aluno_representante: '',
                });
                setClassFormData({ 
                  nome: '', 
                  ano: [], 
                  codigo: '', 
                  professor_regente: '', 
                  aluno_representante: '', 
                  escola_id: activeSchoolId || '', 
                  ano_letivo: selectedYear 
                });
                setShowClassModal(true);
              }}
            >
              <i className="fas fa-plus" style={{ marginRight: 5 }} />
              Nova Turma
            </button>
          </div>
          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Buscar turma por nome ou código..."
              value={classSearchTerm}
              onChange={(e) => setClassSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #ddd',
                borderRadius: 6,
              }}
            />
          </div>
          <div className="list-container list-container--two-cols">
            {classesLoading && (
              <div className="list-item list-item--full-width">
                <span>Carregando turmas...</span>
              </div>
            )}
            {classesError && (
              <div className="list-item list-item--full-width">
                <span>{classesError}</span>
              </div>
            )}
            {!classesLoading &&
              !classesError &&
              filteredClassesSorted.length === 0 &&
              classesList.length > 0 && (
                <div className="list-item list-item--full-width">
                  <span>Nenhuma turma encontrada com o termo "{classSearchTerm}".</span>
                </div>
              )}
            {!classesLoading && !classesError && classesList.length === 0 && (
              <div className="list-item list-item--full-width">
                <span>Nenhuma turma encontrada para esta escola.</span>
              </div>
            )}
            {!classesLoading &&
              !classesError &&
              filteredClassesSorted.map((turma) => {
                const escola = (schools || []).find((s) => String(s.id) === String(turma.escola_id));
                const etiquetas = turmaEtiquetasCount[turma.id] || { verde: 0, amarelo: 0, vermelho: 0, azul: 0 };
                return (
                <div key={turma.id} className="list-item">
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => selectClass(turma)}
                  >
                    <strong style={{ fontSize: '1.1em', display: 'block', marginBottom: 6 }}>{turma.nome}</strong>
                    <div style={{ fontSize: '0.85em', color: '#666', lineHeight: '1.6' }}>
                      {/* Linha 1: Escola, Ano Letivo, Código, Professor e Representante */}
                      <div style={{ marginBottom: 4 }}>
                        <strong>Escola:</strong> {escola?.nome || 'Não informada'} • <strong>Ano Letivo:</strong> {turma.ano_letivo}
                        {turma.codigo && <> • <strong>Código:</strong> {turma.codigo}</>}
                        <> • <strong>Professor:</strong> {turma.professor_regente || 'Não informado'}</>
                        {turma.aluno_representante && (
                          <> • <strong>Representante:</strong> {turma.aluno_representante}</>
                        )}
                      </div>
                      {/* Linha 2: Etiquetas com status e cores */}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {etiquetas.vermelho > 0 && (
                          <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                            🔴 Prioridade: {etiquetas.vermelho}
                          </span>
                        )}
                        {etiquetas.amarelo > 0 && (
                          <span style={{ color: '#ffc107', fontWeight: 'bold' }}>
                            🟡 Atenção: {etiquetas.amarelo}
                          </span>
                        )}
                        {etiquetas.azul > 0 && (
                          <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                            🔵 Regular: {etiquetas.azul}
                          </span>
                        )}
                        {etiquetas.verde > 0 && (
                          <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                            🟢 Avançado: {etiquetas.verde}
                          </span>
                        )}
                        {etiquetas.vermelho === 0 && etiquetas.amarelo === 0 && etiquetas.azul === 0 && etiquetas.verde === 0 && (
                          <span style={{ color: '#999' }}>Nenhum aluno cadastrado</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClass(turma);
                      }}
                      style={{
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <i className="fas fa-edit" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(turma.id);
                      }}
                      style={{
                        background: 'var(--danger)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <i className="fas fa-trash" />
                    </button>
                    <i className="fas fa-chevron-right" style={{ color: '#999' }} />
                  </div>
                </div>
                );
              })}
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

export default ClassesView;
