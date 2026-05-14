import React from 'react';

const RegistroCoordModal = ({
  showRegistroCoordModal,
  handleBackdropMouseDown,
  handleBackdropClick,
  setShowRegistroCoordModal,
  setEditingRegistroCoord,
  savingRegistroCoord,
  editingRegistroCoord,
  handleSaveRegistroCoord,
  registroCoordFormData,
  setRegistroCoordFormData,
}) => {
  if (!showRegistroCoordModal) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
      }}
      onMouseDown={handleBackdropMouseDown}
      onClick={(e) =>
        handleBackdropClick(e, () => {
          if (!savingRegistroCoord) {
            setShowRegistroCoordModal(false);
            setEditingRegistroCoord(null);
          }
        })
      }
    >
      <div
        style={{
          background: 'white',
          padding: 30,
          borderRadius: 12,
          width: '90%',
          maxWidth: 560,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: 20, color: 'var(--primary)' }}>
          {editingRegistroCoord ? 'Editar registro' : 'Nova conversa / registro'}
        </h2>
        <form onSubmit={handleSaveRegistroCoord}>
          <div className="input-group">
            <label>Data *</label>
            <input
              type="date"
              required
              value={registroCoordFormData.data_conversa}
              onChange={(e) =>
                setRegistroCoordFormData({ ...registroCoordFormData, data_conversa: e.target.value })
              }
            />
          </div>
          <div className="input-group">
            <label>Assunto *</label>
            <input
              type="text"
              required
              value={registroCoordFormData.assunto}
              onChange={(e) =>
                setRegistroCoordFormData({ ...registroCoordFormData, assunto: e.target.value })
              }
              placeholder="Ex.: Reunião de feedback, Observação de sala..."
            />
          </div>
          <div className="input-group">
            <label>Relato (o que foi discutido)</label>
            <textarea
              value={registroCoordFormData.relato}
              onChange={(e) =>
                setRegistroCoordFormData({ ...registroCoordFormData, relato: e.target.value })
              }
              rows={4}
              placeholder="Resumo da conversa..."
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #ddd',
                borderRadius: 6,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
          <div className="input-group">
            <label>Encaminhamentos (combinados)</label>
            <textarea
              value={registroCoordFormData.encaminhamentos}
              onChange={(e) =>
                setRegistroCoordFormData({ ...registroCoordFormData, encaminhamentos: e.target.value })
              }
              rows={3}
              placeholder="Próximos passos acordados..."
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #ddd',
                borderRadius: 6,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={savingRegistroCoord}
              onClick={() => {
                setShowRegistroCoordModal(false);
                setEditingRegistroCoord(null);
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingRegistroCoord}>
              {savingRegistroCoord ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistroCoordModal;
