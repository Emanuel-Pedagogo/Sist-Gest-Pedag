import React from 'react';
import ModalShell from '../ModalShell';
import FormField from '../FormField';

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
  const closeModal = () => {
    setShowEntregaModal(false);
    setEditingEntrega(null);
  };

  return (
    <ModalShell
      open={showEntregaModal}
      disabled={savingEntrega}
      onClose={closeModal}
      maxWidth={560}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
      <h2>{editingEntrega ? 'Editar exigência' : 'Nova exigência de entrega'}</h2>
      <form onSubmit={handleSaveEntrega}>
        <FormField label="Tipo de documento" required>
          <input
            type="text"
            required
            list="tipos-entrega-docente"
            value={entregaFormData.tipo_documento}
            onChange={(e) => setEntregaFormData({ ...entregaFormData, tipo_documento: e.target.value })}
            placeholder="Ex.: Plano de Aula, Diário de Classe..."
          />
        </FormField>
        <datalist id="tipos-entrega-docente">
          <option value="Plano de Aula" />
          <option value="Plano de Curso" />
          <option value="Sondagem Alfabetiza Pará" />
          <option value="Diário de Classe" />
          <option value="Planejamento anual" />
        </datalist>
        <FormField label="Referência" required>
          <input
            type="text"
            required
            value={entregaFormData.referencia}
            onChange={(e) => setEntregaFormData({ ...entregaFormData, referencia: e.target.value })}
            placeholder="Ex.: 2º Bimestre - Turma 5º A"
          />
        </FormField>
        <div className="modal-form-grid">
          <FormField label="Status">
            <select
              value={entregaFormData.status}
              onChange={(e) => setEntregaFormData({ ...entregaFormData, status: e.target.value })}
            >
              <option value="pendente">Pendente</option>
              <option value="entregue">Entregue</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </FormField>
          <FormField label="Prazo (opcional)">
            <input
              type="date"
              value={entregaFormData.prazo}
              onChange={(e) => setEntregaFormData({ ...entregaFormData, prazo: e.target.value })}
            />
          </FormField>
        </div>
        <FormField label="Observações">
          <textarea
            value={entregaFormData.observacoes}
            onChange={(e) => setEntregaFormData({ ...entregaFormData, observacoes: e.target.value })}
            rows={3}
            placeholder="Notas internas..."
            style={{ resize: 'vertical' }}
          />
        </FormField>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" disabled={savingEntrega} onClick={closeModal}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={savingEntrega}>
            {savingEntrega ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default EntregaModal;
