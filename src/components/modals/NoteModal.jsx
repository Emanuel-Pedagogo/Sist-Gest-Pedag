import React from 'react';
import ModalShell from '../ModalShell';
import FormField from '../FormField';

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
  return (
    <ModalShell
      open={showNoteModal}
      disabled={savingNote}
      onClose={handleCancelNoteModal}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
      <h2>Adicionar Nota</h2>
      <form onSubmit={handleSaveNote}>
        <FormField label="Disciplina" required style={{ marginBottom: 15 }}>
          <input
            type="text"
            required
            value={noteFormData.disciplina}
            onChange={(e) => setNoteFormData({ ...noteFormData, disciplina: e.target.value })}
            placeholder="Ex: Matemática, Português"
          />
        </FormField>

        <FormField label="Período" required style={{ marginBottom: 15 }}>
          <input
            type="text"
            required
            value={noteFormData.periodo}
            onChange={(e) => setNoteFormData({ ...noteFormData, periodo: e.target.value })}
            placeholder="Ex: 1º Bimestre, 2º Bimestre"
          />
        </FormField>

        <FormField label="Ano" required style={{ marginBottom: 15 }}>
          <input
            type="number"
            required
            value={noteFormData.ano}
            onChange={(e) => setNoteFormData({ ...noteFormData, ano: e.target.value })}
            placeholder="Ex: 2025"
            min="2000"
            max="2100"
          />
        </FormField>

        <FormField label="Valor da Nota" required style={{ marginBottom: 20 }}>
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
        </FormField>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={handleCancelNoteModal} disabled={savingNote}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={savingNote}>
            {savingNote ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default NoteModal;
