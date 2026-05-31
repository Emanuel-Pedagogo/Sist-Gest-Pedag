import React from 'react';
import ModalShell from '../ModalShell';

const FrequencyModal = ({
  showFrequencyModal,
  handleBackdropMouseDown,
  handleBackdropClick,
  handleCancelFrequencyModal,
  handleSaveFrequency,
  frequencyFormData,
  setFrequencyFormData,
  savingFrequency,
}) => {
  return (
    <ModalShell
      open={showFrequencyModal}
      disabled={savingFrequency}
      onClose={handleCancelFrequencyModal}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
      <h2>Adicionar Histórico de Frequência</h2>
      <form onSubmit={handleSaveFrequency}>
        <div className="input-group" style={{ marginBottom: 15 }}>
          <label>Mês de Referência *</label>
          <input
            type="text"
            required
            value={frequencyFormData.mes_referencia}
            onChange={(e) =>
              setFrequencyFormData({ ...frequencyFormData, mes_referencia: e.target.value })
            }
            placeholder="Ex: Janeiro, Fevereiro, Março"
          />
        </div>

        <div className="input-group" style={{ marginBottom: 15 }}>
          <label>Ano *</label>
          <input
            type="number"
            required
            value={frequencyFormData.ano}
            onChange={(e) => setFrequencyFormData({ ...frequencyFormData, ano: e.target.value })}
            placeholder="Ex: 2025"
            min="2000"
            max="2100"
          />
        </div>

        <div className="input-group" style={{ marginBottom: 20 }}>
          <label>Porcentagem *</label>
          <input
            type="number"
            required
            step="0.1"
            min="0"
            max="100"
            value={frequencyFormData.porcentagem}
            onChange={(e) =>
              setFrequencyFormData({ ...frequencyFormData, porcentagem: e.target.value })
            }
            placeholder="Ex: 85.5"
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={handleCancelFrequencyModal} disabled={savingFrequency}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={savingFrequency}>
            {savingFrequency ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default FrequencyModal;
