import React from 'react';
import AlunoListSubtitle from '../components/AlunoListSubtitle';

const StudentsView = ({
  selectedClassName,
  activeSchool,
  setSelectedClassId,
  setSelectedClassName,
  clearPersistedTurmaNav,
  setStudents,
  navigate,
  setEditingStudent,
  setStudentFormData,
  setAeeFormData,
  setShowStudentModal,
  studentSearchTerm,
  setStudentSearchTerm,
  filterStudentTurmaId,
  setFilterStudentTurmaId,
  filterStudentEtiquetaCor,
  setFilterStudentEtiquetaCor,
  classesList,
  studentsLoading,
  studentsError,
  sortedFilteredStudents,
  students,
  selectStudent,
  getBadgeColorClass,
  handleEditStudent,
  handleDeleteStudent,
}) => {
  return (
    <div id="view-students" className="view-section">
      {selectedClassName && (
        <div
          className="breadcrumb"
          onClick={() => {
            setSelectedClassId(null);
            setSelectedClassName('');
            clearPersistedTurmaNav();
            setStudents([]);
            navigate('classes');
          }}
        >
          <i className="fas fa-arrow-left" /> Voltar para Turmas
        </div>
      )}
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
          Alunos {selectedClassName ? `- ${selectedClassName}` : activeSchool ? `- ${activeSchool.nome}` : ''}
        </h2>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
          onClick={() => {
            setEditingStudent(null);
            setStudentFormData({
              nome: '',
              data_nascimento: '',
              turma_id: '',
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
            placeholder="Buscar aluno por nome..."
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
        {!selectedClassName && (
          <div style={{ minWidth: 160 }}>
            <select
              value={filterStudentTurmaId}
              onChange={(e) => setFilterStudentTurmaId(e.target.value || '')}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white',
                fontSize: '0.9em',
              }}
            >
              <option value="">Todas as turmas</option>
              {classesList.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
          </div>
        )}
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
            <span>Nenhum aluno nesta escola/turma.</span>
          </div>
        )}
        {!studentsLoading &&
          !studentsError &&
          sortedFilteredStudents.map((aluno) => {
            const badgeClass = getBadgeColorClass(aluno.etiqueta_cor);
            const turmaAluno = classesList.find((c) => String(c.id) === String(aluno.turma_id));
            const turmaNome = turmaAluno?.nome || 'Turma não informada';
            const professorNome = turmaAluno?.professor_regente;
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
                    <AlunoListSubtitle
                      aluno={aluno}
                      showTurma={!selectedClassName}
                      turmaNome={turmaNome}
                      professorNome={professorNome}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className={`badge ${badgeClass}`}>
                    {aluno.etiqueta_cor === 'vermelho' ? 'Prioridade' : aluno.etiqueta_cor === 'amarelo' ? 'Atenção' : aluno.etiqueta_cor === 'verde' ? 'Avançado' : aluno.etiqueta_cor === 'roxo' ? 'Educação Especial' : 'Regular'}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditStudent(aluno); }}
                    style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteStudent(aluno.id); }}
                    style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default StudentsView;
