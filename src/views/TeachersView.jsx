import React from 'react';

const TeachersView = ({
  activeSchool,
  setEditingTeacher,
  setTeacherFormData,
  setShowTeacherModal,
  teacherSearchTerm,
  setTeacherSearchTerm,
  teachersLoading,
  teachersError,
  filteredTeachers,
  classesList,
  selectTeacher,
  handleEditTeacher,
  handleDeleteTeacher,
}) => {
  return (
    <div id="view-teachers" className="view-section">
      <div className="page-toolbar">
        <h2>
          Professores {activeSchool ? `- ${activeSchool.nome}` : ''}
        </h2>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
          onClick={() => {
            setEditingTeacher(null);
            setTeacherFormData({ nome: '', disciplina: '', turmas_ids: [], auth_email: '' });
            setShowTeacherModal(true);
          }}
        >
          <i className="fas fa-plus" style={{ marginRight: 5 }} />
          Novo Professor
        </button>
      </div>

      <div className="sticky-search-bar">
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div>
            <input
              type="text"
              placeholder="Digite o nome ou a disciplina..."
              value={teacherSearchTerm}
              onChange={(e) => setTeacherSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="list-container">
        {teachersLoading && (
          <div className="list-item">
            <span>Carregando professores...</span>
          </div>
        )}
        {teachersError && (
          <div className="list-item">
            <span>{teachersError}</span>
          </div>
        )}
        {!teachersLoading && !teachersError && filteredTeachers.length === 0 && (
          <div className="list-item">
            <span>Nenhum professor encontrado.</span>
          </div>
        )}

        {!teachersLoading &&
          !teachersError &&
          filteredTeachers.map((p) => {
            const turmaNomes = (Array.isArray(p.turmas_ids) ? p.turmas_ids : [])
              .map((id) => classesList.find((t) => String(t.id) === String(id))?.nome)
              .filter(Boolean);

            return (
              <div
                key={p.id}
                className="list-item"
                onClick={() => selectTeacher(p)}
                title="Abrir perfil do professor"
              >
                <div className="list-item__main">
                  <i className="fas fa-chalkboard-teacher" style={{ color: 'var(--primary)', fontSize: '1.2em', width: 24, textAlign: 'center', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <strong>{p.nome}</strong>
                    <div className="list-item__meta">
                      Disciplina: {p.disciplina || 'Não informado'}
                      {turmaNomes.length > 0 ? ` • Turmas: ${turmaNomes.join(', ')}` : ' • Turmas: -'}
                    </div>
                  </div>
                </div>
                <div className="list-item-actions">
                  <button
                    type="button"
                    className="btn-icon btn-icon--accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTeacher(p);
                    }}
                    title="Editar professor"
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon--danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTeacher(p.id);
                    }}
                    title="Excluir professor"
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

export default TeachersView;
