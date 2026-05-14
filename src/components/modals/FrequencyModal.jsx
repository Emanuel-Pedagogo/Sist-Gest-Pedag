import React from 'react';

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
  if (!showFrequencyModal) return null;

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
      onClick={(e) => handleBackdropClick(e, handleCancelFrequencyModal)}
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
        <h2 style={{ marginBottom: 20, color: 'var(--primary)' }}>Adicionar Histórico de Frequência</h2>
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

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancelFrequencyModal}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
              disabled={savingFrequency}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              disabled={savingFrequency}
            >
              {savingFrequency ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FrequencyModal;
