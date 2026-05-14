import React from 'react';

const EventModal = ({
  showEventModal,
  setShowEventModal,
  savingEvent,
  editingEvent,
  setEditingEvent,
  eventFormData,
  setEventFormData,
  handleSaveEvent,
  generateTimeOptions,
  handleDeleteAgendaEvent,
  handleBackdropMouseDown,
  handleBackdropClick,
}) => {
  if (!showEventModal) return null;

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
        if (!savingEvent) {
          setShowEventModal(false);
          setEditingEvent(null);
        }
      })}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 8,
          padding: 30,
          width: '90%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>
          {editingEvent ? 'Editar Evento' : 'Novo Evento'}
        </h2>
        <form onSubmit={handleSaveEvent}>
          <div className="input-group" style={{ marginBottom: 20 }}>
            <label>Título *</label>
            <input
              type="text"
              value={eventFormData.titulo}
              onChange={(e) => setEventFormData({ ...eventFormData, titulo: e.target.value })}
              required
              placeholder="Ex: Reunião de Pais"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 20 }}>
            <label>Descrição</label>
            <textarea
              value={eventFormData.descricao}
              onChange={(e) => setEventFormData({ ...eventFormData, descricao: e.target.value })}
              placeholder="Descrição do evento..."
              rows={4}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
            <div className="input-group">
              <label>Data de Início *</label>
              <input
                type="date"
                value={eventFormData.data_inicio}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setEventFormData({ 
                    ...eventFormData, 
                    data_inicio: newDate,
                    // Se não houver data de fim, usar a mesma data
                    data_fim: eventFormData.data_fim || newDate
                  });
                }}
                required
              />
            </div>
            <div className="input-group">
              <label>Hora de Início *</label>
              <select
                value={eventFormData.hora_inicio}
                onChange={(e) => setEventFormData({ ...eventFormData, hora_inicio: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: '1em',
                }}
              >
                {generateTimeOptions().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
            <div className="input-group">
              <label>Data de Fim</label>
              <input
                type="date"
                value={eventFormData.data_fim}
                onChange={(e) => setEventFormData({ ...eventFormData, data_fim: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Hora de Fim</label>
              <select
                value={eventFormData.hora_fim}
                onChange={(e) => setEventFormData({ ...eventFormData, hora_fim: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: '1em',
                }}
              >
                {generateTimeOptions().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 20 }}>
            <label>Cor da Etiqueta</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22'].map((color) => (
                <div
                  key={color}
                  onClick={() => setEventFormData({ ...eventFormData, cor_etiqueta: color })}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: color,
                    cursor: 'pointer',
                    border: eventFormData.cor_etiqueta === color ? '3px solid #333' : '2px solid #ddd',
                    transition: 'all 0.2s',
                  }}
                  title={color}
                />
              ))}
            </div>
            <input
              type="color"
              value={eventFormData.cor_etiqueta}
              onChange={(e) => setEventFormData({ ...eventFormData, cor_etiqueta: e.target.value })}
              style={{ marginTop: 10, width: '100%', height: 40, cursor: 'pointer' }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 20 }}>
            <label>Anexo (PDF/Imagem)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setEventFormData({
                    ...eventFormData,
                    anexo_file: file,
                    anexo_nome: file.name,
                  });
                }
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: 6,
              }}
            />
            {eventFormData.anexo_file && (
              <div style={{ marginTop: 10, padding: 10, background: '#f0f0f0', borderRadius: 6, fontSize: '0.9em' }}>
                <i className="fas fa-file" /> {eventFormData.anexo_file.name}
              </div>
            )}
            {editingEvent?.anexo_url && !eventFormData.anexo_file && (
              <div style={{ marginTop: 10 }}>
                <a
                  href={editingEvent.anexo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 15px',
                    background: 'var(--primary)',
                    color: 'white',
                    borderRadius: 6,
                    textDecoration: 'none',
                    fontSize: '0.9em',
                  }}
                >
                  <i className="fas fa-paperclip" /> Baixar Documento Anexado
                  {editingEvent.anexo_nome && (
                    <span style={{ marginLeft: 8, fontSize: '0.85em', opacity: 0.9 }}>
                      ({editingEvent.anexo_nome})
                    </span>
                  )}
                </a>
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
            {editingEvent && (
              <button
                type="button"
                onClick={handleDeleteAgendaEvent}
                style={{
                  marginRight: 'auto',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: 6,
                  backgroundColor: '#ff4444',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Excluir
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowEventModal(false);
                setEditingEvent(null);
                setEventFormData({
                  titulo: '',
                  descricao: '',
                  data_inicio: '',
                  hora_inicio: '08:00',
                  data_fim: '',
                  hora_fim: '09:00',
                  cor_etiqueta: '#3498DB',
                  anexo_nome: '',
                  anexo_file: null,
                });
                // NÃO alterar currentDate ao cancelar para evitar mudança de mês
              }}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: 'white',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
              disabled={savingEvent}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              disabled={savingEvent}
            >
              {savingEvent ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
