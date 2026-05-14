import React from 'react';

const NoteModal = ({
  showNoteModal,
  handleBackdropMouseDown,
  handleBackdropClick,
  handleCancelNoteModal,
  handleSaveNote,
  noteFormData,
  setNoteFormData,
  savingNote,
}) => {
  if (!showNoteModal) return null;

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
      onClick={(e) => handleBackdropClick(e, handleCancelNoteModal)}
    >
      <div
        style={{
          background: 'white',
          padding: 30,
          borderRadius: 12,
          width: '90%',
          maxWidth: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: 20, color: 'var(--primary)' }}>Adicionar Nota</h2>
        <form onSubmit={handleSaveNote}>
          <div className="input-group" style={{ marginBottom: 15 }}>
            <label>Disciplina *</label>
            <input
              type="text"
              required
              value={noteFormData.disciplina}
              onChange={(e) => setNoteFormData({ ...noteFormData, disciplina: e.target.value })}
              placeholder="Ex: Matemática, Português"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 15 }}>
            <label>Período *</label>
            <input
              type="text"
              required
              value={noteFormData.periodo}
              onChange={(e) => setNoteFormData({ ...noteFormData, periodo: e.target.value })}
              placeholder="Ex: 1º Bimestre, 2º Bimestre"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 15 }}>
            <label>Ano *</label>
            <input
              type="number"
              required
              value={noteFormData.ano}
              onChange={(e) => setNoteFormData({ ...noteFormData, ano: e.target.value })}
              placeholder="Ex: 2025"
              min="2000"
              max="2100"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 20 }}>
            <label>Valor da Nota *</label>
            <input
              type="number"
              required
              step="0.1"
              min="0"
              max="10"
              value={noteFormData.valor}
              onChange={(e) => setNoteFormData({ ...noteFormData, valor: e.target.value })}
              placeholder="Ex: 8.5"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancelNoteModal}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
              disabled={savingNote}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              disabled={savingNote}
            >
              {savingNote ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteModal;
