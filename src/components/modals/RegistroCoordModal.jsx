import React from 'react';
import ModalShell from '../ModalShell';
import FormField from '../FormField';

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
  const closeModal = () => {
    setShowRegistroCoordModal(false);
    setEditingRegistroCoord(null);
  };

  return (
    <ModalShell
      open={showRegistroCoordModal}
      disabled={savingRegistroCoord}
      onClose={closeModal}
      maxWidth={560}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
      <h2>{editingRegistroCoord ? 'Editar registro' : 'Nova conversa / registro'}</h2>
      <form onSubmit={handleSaveRegistroCoord}>
        <FormField label="Data" required>
          <input
            type="date"
            required
            value={registroCoordFormData.data_conversa}
            onChange={(e) =>
              setRegistroCoordFormData({ ...registroCoordFormData, data_conversa: e.target.value })
            }
          />
        </FormField>
        <FormField label="Assunto" required>
          <input
            type="text"
            required
            value={registroCoordFormData.assunto}
            onChange={(e) =>
              setRegistroCoordFormData({ ...registroCoordFormData, assunto: e.target.value })
            }
            placeholder="Ex.: Reunião de feedback, Observação de sala..."
          />
        </FormField>
        <FormField label="Relato (o que foi discutido)">
          <textarea
            value={registroCoordFormData.relato}
            onChange={(e) =>
              setRegistroCoordFormData({ ...registroCoordFormData, relato: e.target.value })
            }
            rows={4}
            placeholder="Resumo da conversa..."
            style={{ resize: 'vertical' }}
          />
        </FormField>
        <FormField label="Encaminhamentos (combinados)">
          <textarea
            value={registroCoordFormData.encaminhamentos}
            onChange={(e) =>
              setRegistroCoordFormData({ ...registroCoordFormData, encaminhamentos: e.target.value })
            }
            rows={3}
            placeholder="Próximos passos acordados..."
            style={{ resize: 'vertical' }}
          />
        </FormField>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" disabled={savingRegistroCoord} onClick={closeModal}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={savingRegistroCoord}>
            {savingRegistroCoord ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default RegistroCoordModal;
