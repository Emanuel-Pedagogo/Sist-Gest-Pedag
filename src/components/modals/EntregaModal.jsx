import React from 'react';

const EntregaModal = ({
  showEntregaModal,
  handleBackdropMouseDown,
  handleBackdropClick,
  setShowEntregaModal,
  setEditingEntrega,
  savingEntrega,
  editingEntrega,
  handleSaveEntrega,
  entregaFormData,
  setEntregaFormData,
}) => {
  if (!showEntregaModal) return null;

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
      onClick={(e) =>
        handleBackdropClick(e, () => {
          if (!savingEntrega) {
            setShowEntregaModal(false);
            setEditingEntrega(null);
          }
        })
      }
    >
      <div
        style={{
          background: 'white',
          padding: 30,
          borderRadius: 12,
          width: '90%',
          maxWidth: 560,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: 20, color: 'var(--primary)' }}>
          {editingEntrega ? 'Editar exigência' : 'Nova exigência de entrega'}
        </h2>
        <form onSubmit={handleSaveEntrega}>
          <div className="input-group">
            <label>Tipo de documento *</label>
            <input
              type="text"
              required
              list="tipos-entrega-docente"
              value={entregaFormData.tipo_documento}
              onChange={(e) => setEntregaFormData({ ...entregaFormData, tipo_documento: e.target.value })}
              placeholder="Ex.: Plano de Aula, Diário de Classe..."
            />
            <datalist id="tipos-entrega-docente">
              <option value="Plano de Aula" />
              <option value="Plano de Curso" />
              <option value="Sondagem Alfabetiza Pará" />
              <option value="Diário de Classe" />
              <option value="Planejamento anual" />
            </datalist>
          </div>
          <div className="input-group">
            <label>Referência *</label>
            <input
              type="text"
              required
              value={entregaFormData.referencia}
              onChange={(e) => setEntregaFormData({ ...entregaFormData, referencia: e.target.value })}
              placeholder="Ex.: 2º Bimestre - Turma 5º A"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div className="input-group">
              <label>Status</label>
              <select
                value={entregaFormData.status}
                onChange={(e) => setEntregaFormData({ ...entregaFormData, status: e.target.value })}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
              >
                <option value="pendente">Pendente</option>
                <option value="entregue">Entregue</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>
            <div className="input-group">
              <label>Prazo (opcional)</label>
              <input
                type="date"
                value={entregaFormData.prazo}
                onChange={(e) => setEntregaFormData({ ...entregaFormData, prazo: e.target.value })}
              />
            </div>
          </div>
          <div className="input-group">
            <label>Observações</label>
            <textarea
              value={entregaFormData.observacoes}
              onChange={(e) => setEntregaFormData({ ...entregaFormData, observacoes: e.target.value })}
              rows={3}
              placeholder="Notas internas..."
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
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={savingEntrega}
              onClick={() => {
                setShowEntregaModal(false);
                setEditingEntrega(null);
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingEntrega}>
              {savingEntrega ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntregaModal;
