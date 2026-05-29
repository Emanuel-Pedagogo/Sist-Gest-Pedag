import React, { useMemo } from 'react';
import ModalShell from '../ModalShell';
import { RECORRENCIA_OPCOES, INITIAL_EVENT_FORM_DATA } from '../../utils/agendaConstants';
import { countRecurringOccurrences, getDefaultRecorrenciaAte } from '../../utils/agendaRecorrencia';

const EventModal = ({  showEventModal,
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
  const ocorrenciasPrevistas = useMemo(
    () => countRecurringOccurrences(eventFormData),
    [eventFormData]
  );

  const closeModal = () => {
    setShowEventModal(false);
    setEditingEvent(null);
  };

  return (
    <ModalShell
      open={showEventModal}
      disabled={savingEvent}
      onClose={closeModal}
      handleBackdropMouseDown={handleBackdropMouseDown}
      handleBackdropClick={handleBackdropClick}
    >
        <h2>
          {editingEvent ? 'Editar Evento' : 'Novo Evento'}
        </h2>        <form onSubmit={handleSaveEvent}>
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
            <label>Observação</label>
            <textarea
              value={eventFormData.descricao}
              onChange={(e) => setEventFormData({ ...eventFormData, descricao: e.target.value })}
              placeholder="Lembrete, detalhes ou orientações deste evento (aparece no planejamento exportado)..."
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

          <div className="modal-form-grid" style={{ marginBottom: 20 }}>
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

          <div className="modal-form-grid" style={{ marginBottom: 20 }}>
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
            <label>Repetir</label>
            <select
              value={eventFormData.recorrencia_tipo || 'nenhuma'}
              onChange={(e) => {
                const tipo = e.target.value;
                const recorrencia_ate =
                  tipo === 'nenhuma'
                    ? ''
                    : eventFormData.recorrencia_ate ||
                      getDefaultRecorrenciaAte(eventFormData.data_inicio, tipo);
                setEventFormData({
                  ...eventFormData,
                  recorrencia_tipo: tipo,
                  recorrencia_ate,
                });
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: '1em',
              }}
            >
              {RECORRENCIA_OPCOES.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            {eventFormData.recorrencia_tipo && eventFormData.recorrencia_tipo !== 'nenhuma' && (
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.9em' }}>
                  Repetir até *
                </label>
                <input
                  type="date"
                  value={eventFormData.recorrencia_ate || ''}
                  min={eventFormData.data_inicio || undefined}
                  onChange={(e) =>
                    setEventFormData({ ...eventFormData, recorrencia_ate: e.target.value })
                  }
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                  }}
                />
                <div
                  style={{
                    marginTop: 14,
                    padding: '12px 14px',
                    background: '#f8f9fa',
                    borderRadius: 8,
                    border: '1px solid #eee',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.85em',
                      fontWeight: 600,
                      marginBottom: 10,
                      color: '#555',
                    }}
                  >
                    Incluir finais de semana quando a recorrência cair nesses dias:
                  </span>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                      cursor: 'pointer',
                      fontSize: '0.9em',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!eventFormData.incluir_sabado}
                      onChange={(e) =>
                        setEventFormData({ ...eventFormData, incluir_sabado: e.target.checked })
                      }
                    />
                    Sábados
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: '0.9em',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!eventFormData.incluir_domingo}
                      onChange={(e) =>
                        setEventFormData({ ...eventFormData, incluir_domingo: e.target.checked })
                      }
                    />
                    Domingos
                  </label>
                  <p style={{ margin: '10px 0 0', fontSize: '0.8em', color: '#888' }}>
                    Se desmarcado, ocorrências em sábado ou domingo são ignoradas (exceto a data de
                    início, se for nesse dia).
                  </p>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.85em', color: '#666' }}>
                  {editingEvent?.serie_id ? (
                    <>
                      A série terá <strong>{ocorrenciasPrevistas}</strong> evento
                      {ocorrenciasPrevistas !== 1 ? 's' : ''} no período. Se alterar a recorrência e
                      salvar, a série inteira poderá ser recriada.
                    </>
                  ) : editingEvent ? (
                    ocorrenciasPrevistas > 1 ? (
                      <>
                        Total de <strong>{ocorrenciasPrevistas}</strong> evento
                        {ocorrenciasPrevistas !== 1 ? 's' : ''} no período (
                        <strong>{ocorrenciasPrevistas - 1}</strong> novo
                        {ocorrenciasPrevistas - 1 !== 1 ? 's' : ''} além deste).
                      </>
                    ) : (
                      <>Ajuste a data &quot;Repetir até&quot; para incluir mais ocorrências.</>
                    )
                  ) : (
                    <>
                      Serão criados <strong>{ocorrenciasPrevistas}</strong> evento
                      {ocorrenciasPrevistas !== 1 ? 's' : ''} no calendário.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          {editingEvent?.serie_id && (
            <p
              style={{
                margin: '0 0 16px',
                padding: '10px 12px',
                background: '#f0f7ff',
                borderRadius: 6,
                fontSize: '0.85em',
                color: '#444',
              }}
            >
              <i className="fas fa-redo" style={{ marginRight: 6 }} />
              Este evento faz parte de uma série recorrente. Ao salvar dados gerais ou excluir, você
              poderá escolher aplicar a todos ou apenas a este.
            </p>
          )}

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
            <label>Anexo (PDF, imagem ou Word)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
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

          <div className="modal-actions">
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
                setEventFormData({ ...INITIAL_EVENT_FORM_DATA });
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
    </ModalShell>
  );
};
export default EventModal;
