import React from 'react';

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
  if (!showSchoolModal) return null;

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
      onClick={(e) => handleBackdropClick(e, () => {
        setShowSchoolModal(false);
        setEditingSchool(null);
        setSchoolFormData({ nome: '', inep: '', endereco: '', tipo: 'Polo' });
      })}
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
          {editingSchool ? 'Editar Escola' : 'Nova Escola'}
        </h2>
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
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #ddd',
                borderRadius: 6,
              }}
            >
              <option value="Polo">Polo</option>
              <option value="Anexa">Anexa</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setShowSchoolModal(false);
                setEditingSchool(null);
                setSchoolFormData({ nome: '', inep: '', endereco: '', tipo: 'Polo' });
              }}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
              disabled={savingSchool}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              disabled={savingSchool}
            >
              {savingSchool ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolModal;
