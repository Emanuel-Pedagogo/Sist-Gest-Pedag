import React from 'react';

const AgendaSemedToolbar = ({
  onOpenImport,
  showSemedMarcos,
  setShowSemedMarcos,
  hasSemedImport,
}) => (
  <>
    <button
      type="button"
      onClick={onOpenImport}
      title="Importar calendário oficial da SEMED (feriados e marcos)"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        border: '1px solid #c4b5fd',
        borderRadius: 6,
        background: hasSemedImport ? '#f5f3ff' : '#ede9fe',
        color: '#5b21b6',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 600,
      }}
    >
      <i className="fas fa-calendar-check" />
      {hasSemedImport ? 'Calendário SEMED' : 'Configurar SEMED'}
    </button>
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.8rem',
        color: '#555',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      title="Exibir ou ocultar feriados e marcos oficiais no calendário"
    >
      <input
        type="checkbox"
        checked={showSemedMarcos}
        onChange={(e) => setShowSemedMarcos(e.target.checked)}
      />
      Marcos SEMED
    </label>
  </>
);

export default AgendaSemedToolbar;
