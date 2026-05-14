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
          Professores {activeSchool ? `- ${activeSchool.nome}` : ''}
        </h2>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
          onClick={() => {
            setEditingTeacher(null);
            setTeacherFormData({ nome: '', disciplina: '', turmas_ids: [] });
            setShowTeacherModal(true);
          }}
        >
          <i className="fas fa-plus" style={{ marginRight: 5 }} />
          Novo Professor
        </button>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <input
            type="text"
            placeholder="Digite o nome ou a disciplina..."
            value={teacherSearchTerm}
            onChange={(e) => setTeacherSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ddd',
              borderRadius: 6,
            }}
          />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <i className="fas fa-chalkboard-teacher" style={{ color: 'var(--primary)', fontSize: '1.2em', width: 24, textAlign: 'center' }} />
                  <div>
                    <strong>{p.nome}</strong>
                    <div style={{ fontSize: '0.8em', color: 'gray' }}>
                      Disciplina: {p.disciplina || 'Não informado'}
                      {turmaNomes.length > 0 ? ` • Turmas: ${turmaNomes.join(', ')}` : ' • Turmas: -'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTeacher(p);
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
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTeacher(p.id);
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
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default TeachersView;
