import React from 'react';
import AlunoListSubtitle from '../components/AlunoListSubtitle';
import EmptyState from '../components/EmptyState';
import EtiquetaIcon from '../components/EtiquetaIcon';
import { ETIQUETA_ORDER, ETIQUETA_LABELS, getEtiquetaLabel } from '../utils/etiquetas';
import EtiquetaGlossarioButton from '../components/EtiquetaGlossario';

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
      <div className="page-toolbar students-toolbar">
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

      <div className="filter-bar students-filters">
        <div className="input-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <label htmlFor="students-search">Buscar aluno</label>
          <input
            id="students-search"
            type="text"
            placeholder="Buscar aluno por nome..."
            value={studentSearchTerm}
            onChange={(e) => setStudentSearchTerm(e.target.value)}
          />
        </div>
        {!selectedClassName && (
          <div className="input-group" style={{ minWidth: 160, marginBottom: 0 }}>
            <label htmlFor="students-class-filter">Turma</label>
            <select
              id="students-class-filter"
              value={filterStudentTurmaId}
              onChange={(e) => setFilterStudentTurmaId(e.target.value || '')}
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
        <div className="input-group" style={{ minWidth: 160, marginBottom: 0 }}>
          <label htmlFor="students-tag-filter" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Etiqueta
            <EtiquetaGlossarioButton compact className="etiqueta-glossario-btn--inline" />
          </label>
          <select
            id="students-tag-filter"
            value={filterStudentEtiquetaCor}
            onChange={(e) => setFilterStudentEtiquetaCor(e.target.value || '')}
          >
            <option value="">Todas as etiquetas</option>
            {ETIQUETA_ORDER.map((cor) => (
              <option key={cor} value={cor}>{ETIQUETA_LABELS[cor]}</option>
            ))}
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
          <EmptyState
            icon="fas fa-search"
            title="Nenhum aluno encontrado"
            description="Tente outro nome ou limpe os filtros de turma e etiqueta."
          />
        )}
        {!studentsLoading && !studentsError && students.length === 0 && (
          <EmptyState
            icon="fas fa-user-graduate"
            title="Nenhum aluno cadastrado"
            description={selectedClassName
              ? `Cadastre o primeiro aluno da turma ${selectedClassName}.`
              : 'Comece adicionando alunos à escola ou selecione uma turma.'}
            actionLabel="Cadastrar aluno"
            onAction={() => {
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
          />
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
                  <EtiquetaIcon cor={aluno.etiqueta_cor} />
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
                <div className="list-item-actions">
                  <span className={`badge ${badgeClass}`}>
                    {getEtiquetaLabel(aluno.etiqueta_cor)}
                  </span>
                  <button
                    type="button"
                    className="btn-icon btn-icon--accent"
                    onClick={(e) => { e.stopPropagation(); handleEditStudent(aluno); }}
                    aria-label={`Editar ${aluno.nome}`}
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon--danger"
                    onClick={(e) => { e.stopPropagation(); handleDeleteStudent(aluno.id); }}
                    aria-label={`Excluir ${aluno.nome}`}
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
