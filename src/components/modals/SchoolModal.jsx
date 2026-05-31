import React from 'react';
import ModalShell from '../ModalShell';

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
        <div className="input-group" style={{ marginBottom: 15 }}>
          <label>Nome *</label>
          <input
            type="text"
            required
            value={schoolFormData.nome}
            onChange={(e) => setSchoolFormData({ ...schoolFormData, nome: e.target.value })}
            placeholder="Nome da escola"
          />
        </div>

        <div className="input-group" style={{ marginBottom: 15 }}>
          <label>INEP *</label>
          <input
            type="text"
            required
            value={schoolFormData.inep}
            onChange={(e) => setSchoolFormData({ ...schoolFormData, inep: e.target.value })}
            placeholder="Código INEP"
          />
        </div>

        <div className="input-group" style={{ marginBottom: 15 }}>
          <label>Endereço *</label>
          <input
            type="text"
            required
            value={schoolFormData.endereco}
            onChange={(e) => setSchoolFormData({ ...schoolFormData, endereco: e.target.value })}
            placeholder="Endereço completo"
          />
        </div>

        <div className="input-group" style={{ marginBottom: 20 }}>
          <label>Tipo *</label>
          <select
            required
            value={schoolFormData.tipo}
            onChange={(e) => setSchoolFormData({ ...schoolFormData, tipo: e.target.value })}
          >
            <option value="Polo">Polo</option>
            <option value="Anexa">Anexa</option>
          </select>
        </div>

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
