import React, { memo } from 'react';

const TeacherListItem = memo(({
  professor,
  selectProfessor,
  handleEditProfessor,
  handleDeleteProfessor,
  canManageCadastro,
}) => {
  return (
    <div className="list-item">
      <button
        type="button"
        className="btn-unstyled list-item__main"
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
        onClick={() => selectProfessor(professor)}
      >
        <div style={{ fontSize: '1.4em', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-chalkboard-teacher" />
        </div>
        <div>
          <strong>{professor.nome}</strong>
          <div className="list-item__meta">
            {professor.disciplina || 'Disciplina não informada'}
            {professor.ano_letivo ? ` • ${professor.ano_letivo}` : ''}
          </div>
        </div>
      </button>
      <div className="list-item-actions">
        {canManageCadastro && (
          <button
            type="button"
            className="btn-icon btn-icon--accent"
            onClick={(e) => { e.stopPropagation(); handleEditProfessor(professor); }}
            aria-label={`Editar ${professor.nome}`}
          >
            <i className="fas fa-edit" />
          </button>
        )}
        {canManageCadastro && (
          <button
            type="button"
            className="btn-icon btn-icon--danger"
            onClick={(e) => { e.stopPropagation(); handleDeleteProfessor(professor.id); }}
            aria-label={`Excluir ${professor.nome}`}
          >
            <i className="fas fa-trash" />
          </button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.professor.id === nextProps.professor.id &&
    prevProps.professor.nome === nextProps.professor.nome &&
    prevProps.professor.disciplina === nextProps.professor.disciplina &&
    prevProps.canManageCadastro === nextProps.canManageCadastro
  );
});

TeacherListItem.displayName = 'TeacherListItem';

export default TeacherListItem;
