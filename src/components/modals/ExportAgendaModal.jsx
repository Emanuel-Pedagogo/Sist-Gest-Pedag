import React, { useState, useEffect } from 'react';
import ModalShell from '../ModalShell';
import { ETIQUETA_CORES, ALL_ETIQUETA_IDS } from '../../utils/agendaConstants';

const ExportAgendaModal = ({
  open,
  onClose,
  onExportPDF,
  onExportWord,
  exporting,
  periodLabel,
  handleBackdropMouseDown,
  handleBackdropClick,
}) => {
  const [selectedIds, setSelectedIds] = useState([...ALL_ETIQUETA_IDS]);

  useEffect(() => {
    if (open) setSelectedIds([...ALL_ETIQUETA_IDS]);
  }, [open]);

  const toggleCategory = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allSelected = selectedIds.length === ALL_ETIQUETA_IDS.length;
  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : [...ALL_ETIQUETA_IDS]);
  };

  const canExport = selectedIds.length > 0 && !exporting;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      disabled={exporting}
      maxWidth={480}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
      <h2 style={{ marginTop: 0 }}>Exportar planejamento</h2>
      <p style={{ margin: '0 0 16px', fontSize: '0.9em', color: '#666' }}>
        Período: <strong>{periodLabel}</strong>
      </p>
      <p style={{ margin: '0 0 10px', fontSize: '0.85em', color: '#555' }}>
        Selecione os tipos de evento que deseja incluir na exportação:
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: '0.85em', fontWeight: 600, color: '#444' }}>Categorias</span>
        <button
          type="button"
          onClick={toggleAll}
          disabled={exporting}
          style={{
            border: 'none',
            background: 'none',
            color: 'var(--primary)',
            cursor: exporting ? 'default' : 'pointer',
            fontSize: '0.8em',
            padding: 0,
          }}
        >
          {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {ETIQUETA_CORES.map((cat) => {
          const checked = selectedIds.includes(cat.id);
          return (
            <label
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                border: checked ? '2px solid var(--primary)' : '1px solid #ddd',
                background: checked ? '#f0f7ff' : '#fafafa',
                cursor: exporting ? 'default' : 'pointer',
                fontSize: '0.85em',
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={exporting}
                onChange={() => toggleCategory(cat.id)}
              />
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: cat.color,
                  flexShrink: 0,
                }}
              />
              {cat.label}
            </label>
          );
        })}
      </div>

      <p style={{ margin: '0 0 16px', fontSize: '0.8em', color: '#888' }}>
        O arquivo será gerado em formato de calendário (paisagem), com cores, título, observação e
        legenda.
      </p>

      <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={exporting}
          style={{
            padding: '10px 20px',
            border: '1px solid #ddd',
            borderRadius: 6,
            background: 'white',
            cursor: exporting ? 'default' : 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onExportWord(selectedIds)}
          disabled={!canExport}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            border: '1px solid #ddd',
            borderRadius: 6,
            background: 'white',
            cursor: canExport ? 'pointer' : 'not-allowed',
            opacity: canExport ? 1 : 0.6,
          }}
        >
          <i className="fas fa-file-word" style={{ color: '#2b579a' }} />
          Word
        </button>
        <button
          type="button"
          onClick={() => onExportPDF(selectedIds)}
          disabled={!canExport}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            width: 'auto',
            padding: '10px 16px',
            opacity: canExport ? 1 : 0.6,
            cursor: canExport ? 'pointer' : 'not-allowed',
          }}
        >
          <i className="fas fa-file-pdf" />
          {exporting ? 'Exportando...' : 'PDF'}
        </button>
      </div>
    </ModalShell>
  );
};

export default ExportAgendaModal;
