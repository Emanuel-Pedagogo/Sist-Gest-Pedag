import React from 'react';

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
  if (!showModal) return null;

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
      onClick={(e) => handleBackdropClick(e, handleCancelModal)}
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
        <h2 style={{ marginBottom: 20, color: 'var(--primary)' }}>
          {editingOccurrence ? 'Editar Ocorrência' : 'Nova Ocorrência'}
        </h2>
        <form onSubmit={handleSaveOccurrence}>
          <div className="input-group" style={{ marginBottom: 15 }}>
            <label>Título *</label>
            <input
              type="text"
              required
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Dificuldade de Leitura"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 15 }}>
            <label>Tipo *</label>
            <select
              required
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #ddd',
                borderRadius: 6,
              }}
            >
              <option value="Pedagógico">Pedagógico</option>
              <option value="Comportamental">Comportamental</option>
              <option value="Família">Família</option>
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 15 }}>
            <label>Data *</label>
            <input
              type="date"
              required
              value={formData.data_ocorrencia}
              onChange={(e) => setFormData({ ...formData, data_ocorrencia: e.target.value })}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 20 }}>
            <label>Descrição *</label>
            <textarea
              required
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva a ocorrência..."
              rows={5}
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

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancelModal}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
              disabled={savingOccurrence}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              disabled={savingOccurrence}
            >
              {savingOccurrence ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OccurrenceModal;
