import React from 'react';
import ModalShell from '../ModalShell';
import FormField from '../FormField';

const SchoolModal = ({
  showSchoolModal,
  handleBackdropMouseDown,
  handleBackdropClick,
  setShowSchoolModal,
  setEditingSchool,
  setSchoolFormData,
  editingSchool,
  handleSaveSchool,
  schoolFormData,
  savingSchool,
}) => {
  const resetForm = () => {
    setSchoolFormData({ nome: '', inep: '', endereco: '', tipo: 'Polo' });
  };

  const closeModal = () => {
    setShowSchoolModal(false);
    setEditingSchool(null);
    resetForm();
  };

  return (
    <ModalShell
      open={showSchoolModal}
      disabled={savingSchool}
      onClose={closeModal}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
      <h2>{editingSchool ? 'Editar Escola' : 'Nova Escola'}</h2>
      <form key={editingSchool?.id ?? 'new'} onSubmit={handleSaveSchool}>
        <FormField label="Nome" required style={{ marginBottom: 15 }}>
          <input
            type="text"
            required
            value={schoolFormData.nome}
            onChange={(e) => setSchoolFormData({ ...schoolFormData, nome: e.target.value })}
            placeholder="Nome da escola"
          />
        </FormField>

        <FormField label="INEP" required style={{ marginBottom: 15 }}>
          <input
            type="text"
            required
            value={schoolFormData.inep}
            onChange={(e) => setSchoolFormData({ ...schoolFormData, inep: e.target.value })}
            placeholder="Código INEP"
          />
        </FormField>

        <FormField label="Endereço" required style={{ marginBottom: 15 }}>
          <input
            type="text"
            required
            value={schoolFormData.endereco}
            onChange={(e) => setSchoolFormData({ ...schoolFormData, endereco: e.target.value })}
            placeholder="Endereço completo"
          />
        </FormField>

        <FormField label="Tipo" required style={{ marginBottom: 20 }}>
          <select
            required
            value={schoolFormData.tipo}
            onChange={(e) => setSchoolFormData({ ...schoolFormData, tipo: e.target.value })}
          >
            <option value="Polo">Polo</option>
            <option value="Anexa">Anexa</option>
          </select>
        </FormField>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={closeModal} disabled={savingSchool}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={savingSchool}>
            {savingSchool ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default SchoolModal;
