import React from 'react';

const AgendaView = ({
  agendaView,
  setAgendaView,
  setEditingEvent,
  setEventFormData,
  setShowEventModal,
  currentDate,
  setCurrentDate,
  agendaEvents,
  getBirthdayEventsForDay,
  splitDateTime,
}) => {
  return (
    <div id="view-agenda" className="view-section">
      {/* Botões de visualização: Mês, Semana, Dia à esquerda; Novo Evento à direita */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setAgendaView('month')}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: 6,
              background: agendaView === 'month' ? 'var(--primary)' : 'white',
              color: agendaView === 'month' ? 'white' : '#333',
              cursor: 'pointer',
            }}
          >
            Mês
          </button>
          <button
            onClick={() => setAgendaView('week')}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: 6,
              background: agendaView === 'week' ? 'var(--primary)' : 'white',
              color: agendaView === 'week' ? 'white' : '#333',
              cursor: 'pointer',
            }}
          >
            Semana
          </button>
          <button
            onClick={() => setAgendaView('day')}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: 6,
              background: agendaView === 'day' ? 'var(--primary)' : 'white',
              color: agendaView === 'day' ? 'white' : '#333',
              cursor: 'pointer',
            }}
          >
            Dia
          </button>
        </div>
        <button
          onClick={() => {
            setEditingEvent(null);
            const hoje = new Date();
            const dateStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
            setEventFormData({
              titulo: '',
              descricao: '',
              data_inicio: dateStr,
              hora_inicio: '08:00',
              data_fim: dateStr,
              hora_fim: '09:00',
              cor_etiqueta: '#3498DB',
              anexo_nome: '',
              anexo_file: null,
            });
            setShowEventModal(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '8px 10px',
            border: '1px solid transparent',
            borderRadius: 6,
            background: 'var(--primary)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.8rem',
            lineHeight: 1,
          }}
        >
          <i className="fas fa-plus" style={{ fontSize: '0.75rem' }} /> Novo Evento
        </button>
      </div>

      {/* Cabeçalho do mês: Anterior | MÊS ANO | Próximo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            setCurrentDate(new Date(year, month - 1, 1));
          }}
          style={{
            padding: '6px 10px',
            border: '1px solid #ddd',
            borderRadius: 6,
            background: 'white',
            cursor: 'pointer',
            fontSize: '1em',
            lineHeight: 1,
          }}
          aria-label="Mês anterior"
        >
          &lt;
        </button>
        <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#333', fontSize: '1rem' }}>
          {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          type="button"
          onClick={() => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            setCurrentDate(new Date(year, month + 1, 1));
          }}
          style={{
            padding: '6px 10px',
            border: '1px solid #ddd',
            borderRadius: 6,
            background: 'white',
            cursor: 'pointer',
            fontSize: '1em',
            lineHeight: 1,
          }}
          aria-label="Próximo mês"
        >
          &gt;
        </button>
      </div>

      {/* Calendário (grid usa currentDate) */}
      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
          {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(d => (
            <div key={d} style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#666', fontSize: '0.85rem' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: '320px' }}>
          {(() => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const slots = [];

            for (let i = 0; i < firstDay; i++) {
              slots.push(<div key={`empty-${i}`} style={{ background: '#fafafa', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}></div>);
            }

            for (let day = 1; day <= daysInMonth; day++) {
              const dayAgendaEvents = agendaEvents.filter(ev => {
                if (!ev.data_inicio) return false;
                const evDate = new Date(ev.data_inicio);
                return evDate.getFullYear() === year && evDate.getMonth() === month && evDate.getDate() === day;
              });
              const dayBirthdays = getBirthdayEventsForDay(year, month, day);
              const dayEvents = [...dayAgendaEvents, ...dayBirthdays];

              slots.push(
                <div key={day}
                  style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #eee', padding: '5px', height: '64px', position: 'relative', cursor: 'pointer', fontSize: '0.8rem' }}
                  onClick={() => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    setEditingEvent(null);
                    setEventFormData({
                      titulo: '',
                      descricao: '',
                      data_inicio: dateStr,
                      hora_inicio: '08:00',
                      data_fim: dateStr,
                      hora_fim: '09:00',
                      cor_etiqueta: '#3498DB',
                      anexo_nome: '',
                      anexo_file: null,
                    });
                    setShowEventModal(true);
                  }}
                >
                  <span style={{ fontWeight: 'bold', color: '#333' }}>{day}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '5px' }}>
                    {dayEvents.map(ev => {
                      const inicio = splitDateTime(ev.data_inicio);
                      const fim = ev.data_fim ? splitDateTime(ev.data_fim) : inicio;
                      const cor = (typeof ev.cor_etiqueta === 'string' && ev.cor_etiqueta.startsWith('#')) ? ev.cor_etiqueta : (ev.cor_etiqueta === 'vermelho' ? '#ef4444' : ev.cor_etiqueta === 'verde' ? '#10b981' : ev.cor_etiqueta === 'amarelo' ? '#eab308' : '#3b82f6');
                      const isAniversario = ev.tipo === 'aniversario';
                      return (
                        <div key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAniversario) return;
                            setEditingEvent(ev);
                            setEventFormData({
                              titulo: ev.titulo || '',
                              descricao: ev.descricao || '',
                              data_inicio: inicio.date,
                              hora_inicio: inicio.time,
                              data_fim: fim.date,
                              hora_fim: fim.time,
                              cor_etiqueta: cor,
                              anexo_nome: ev.anexo_nome || '',
                              anexo_file: null,
                            });
                            setShowEventModal(true);
                          }}
                          style={{
                            fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', color: 'white',
                            background: cor,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            cursor: isAniversario ? 'default' : 'pointer',
                          }}>
                          {ev.titulo}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return slots;
          })()}
        </div>
      </div>

    </div>
  );
};

export default AgendaView;
