import React from 'react';
import ModalShell from '../ModalShell';
import FormField from '../FormField';

const OccurrenceModal = ({
  showModal,
  handleBackdropMouseDown,
  handleBackdropClick,
  handleCancelModal,
  editingOccurrence,
  handleSaveOccurrence,
  formData,
  setFormData,
  savingOccurrence,
}) => {
  return (
    <ModalShell
      open={showModal}
      disabled={savingOccurrence}
      onClose={handleCancelModal}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
      <h2>{editingOccurrence ? 'Editar Ocorrência' : 'Nova Ocorrência'}</h2>
      <form onSubmit={handleSaveOccurrence}>
        <FormField label="Título" required style={{ marginBottom: 15 }}>
          <input
            type="text"
            required
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            placeholder="Ex: Dificuldade de Leitura"
          />
        </FormField>

        <FormField label="Tipo" required style={{ marginBottom: 15 }}>
          <select
            required
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
          >
            <option value="Pedagógico">Pedagógico</option>
            <option value="Comportamental">Comportamental</option>
            <option value="Família">Família</option>
          </select>
        </FormField>

        <FormField label="Data" required style={{ marginBottom: 15 }}>
          <input
            type="date"
            required
            value={formData.data_ocorrencia}
            onChange={(e) => setFormData({ ...formData, data_ocorrencia: e.target.value })}
          />
        </FormField>

        <FormField label="Descrição" required style={{ marginBottom: 20 }}>
          <textarea
            required
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Descreva a ocorrência..."
            rows={5}
            style={{ resize: 'vertical' }}
          />
        </FormField>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={handleCancelModal} disabled={savingOccurrence}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={savingOccurrence}>
            {savingOccurrence ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default OccurrenceModal;
