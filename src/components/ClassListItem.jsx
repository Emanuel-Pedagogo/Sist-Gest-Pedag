import React, { memo } from 'react';

const ClassListItem = memo(({
  turma,
  selectClass,
  handleEditClass,
  handleDeleteClass,
  canManageCadastro,
  escolas,
}) => {
  const escolaNome = escolas.find((e) => String(e.id) === String(turma.escola_id))?.nome || 'Escola não informada';

  return (
    <div className="list-item">
      <button
        type="button"
        className="btn-unstyled"
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
        onClick={() => selectClass(turma)}
      >
        <div style={{ fontSize: '1.4em', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-book" />
        </div>
        <div>
          <strong>{turma.nome}</strong>
          <div className="list-item__meta">
            {escolaNome}
            {turma.ano_letivo ? ` • ${turma.ano_letivo}` : ''}
          </div>
        </div>
      </button>
      <div className="list-item-actions">
        {canManageCadastro && (
          <button
            type="button"
            className="btn-icon btn-icon--accent"
            onClick={(e) => { e.stopPropagation(); handleEditClass(turma); }}
            aria-label={`Editar ${turma.nome}`}
          >
            <i className="fas fa-edit" />
          </button>
        )}
        {canManageCadastro && (
          <button
            type="button"
            className="btn-icon btn-icon--danger"
            onClick={(e) => { e.stopPropagation(); handleDeleteClass(turma.id); }}
            aria-label={`Excluir ${turma.nome}`}
          >
            <i className="fas fa-trash" />
          </button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.turma.id === nextProps.turma.id &&
    prevProps.turma.nome === nextProps.turma.nome &&
    prevProps.turma.escola_id === nextProps.turma.escola_id &&
    prevProps.canManageCadastro === nextProps.canManageCadastro
  );
});

ClassListItem.displayName = 'ClassListItem';

export default ClassListItem;
