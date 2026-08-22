import React, { memo } from 'react';

const SchoolListItem = memo(({
  escola,
  selectSchool,
  handleEditSchool,
  handleDeleteSchool,
  canManageCadastro,
}) => {
  return (
    <div className="list-item">
      <button
        type="button"
        className="btn-unstyled"
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
        onClick={() => selectSchool(escola)}
      >
        <div style={{ fontSize: '1.4em', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-school" />
        </div>
        <div>
          <strong>{escola.nome}</strong>
          {escola.codigo && (
            <div className="list-item__meta">{escola.codigo}</div>
          )}
        </div>
      </button>
      <div className="list-item-actions">
        {canManageCadastro && (
          <button
            type="button"
            className="btn-icon btn-icon--accent"
            onClick={(e) => { e.stopPropagation(); handleEditSchool(escola); }}
            aria-label={`Editar ${escola.nome}`}
          >
            <i className="fas fa-edit" />
          </button>
        )}
        {canManageCadastro && (
          <button
            type="button"
            className="btn-icon btn-icon--danger"
            onClick={(e) => { e.stopPropagation(); handleDeleteSchool(escola.id); }}
            aria-label={`Excluir ${escola.nome}`}
          >
            <i className="fas fa-trash" />
          </button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.escola.id === nextProps.escola.id &&
    prevProps.escola.nome === nextProps.escola.nome &&
    prevProps.canManageCadastro === nextProps.canManageCadastro
  );
});

SchoolListItem.displayName = 'SchoolListItem';

export default SchoolListItem;
