import React from 'react';

const DashboardView = ({
  totalAzul,
  totalAtencao,
  totalRisco,
  totalVerde,
  totalRoxo,
  totalAlunos,
  setFilterStudentEtiquetaCor,
  setFilterStudentTurmaId,
  setSelectedClassId,
  setSelectedClassName,
  clearPersistedTurmaNav,
  setCurrentView,
  dashboardLoading,
  dashboardWeekStart,
  setDashboardWeekStart,
  dashboardSelectedDate,
  setDashboardSelectedDate,
  getWeekDates,
  isSameDay,
  isToday,
  dayNames,
  dashboardDayEventsLoading,
  dashboardDayEvents,
  setCurrentDate,
  setAgendaView,
  onOpenEventDetail,
}) => {
  return (
    <div id="view-dashboard" className="view-section">
      {/* Blocos clicáveis (etiquetas) – acima dos dias da semana */}
      <div className="dashboard-etiquetas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Adequado', count: totalAzul, cor: 'azul', color: '#007bff' },
          { label: 'Atenção', count: totalAtencao, cor: 'amarelo', color: '#ffc107' },
          { label: 'Risco', count: totalRisco, cor: 'vermelho', color: '#dc3545' },
          { label: 'Avançado', count: totalVerde, cor: 'verde', color: '#28a745' },
          { label: 'AEE', count: totalRoxo, cor: 'roxo', color: '#9c27b0' },
          { label: 'Total de Alunos', count: totalAlunos, cor: '', color: '#374151' },
        ].map((item) => (
          <button
            type="button"
            key={item.cor || 'total'}
            onClick={() => {
              setFilterStudentEtiquetaCor(item.cor);
              setFilterStudentTurmaId('');
              setSelectedClassId(null);
              setSelectedClassName('');
              clearPersistedTurmaNav();
              setCurrentView('students');
            }}
            className="card"
            style={{
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid #e0e0e0',
              padding: 12,
              borderRadius: 10,
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>
              {item.label}
            </h4>
            <div className="number" style={{ color: item.color, fontSize: '1.35rem', fontWeight: 700 }}>
              {dashboardLoading ? '...' : item.count}
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Semana atual</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => {
              const prev = new Date(dashboardWeekStart);
              prev.setDate(prev.getDate() - 7);
              setDashboardWeekStart(prev);
              setDashboardSelectedDate(new Date(prev));
            }}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: 6,
              background: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            ‹
          </button>
          <span style={{ fontSize: '0.8rem', color: '#666', minWidth: 120, textAlign: 'center' }}>
            {getWeekDates(dashboardWeekStart)[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – {getWeekDates(dashboardWeekStart)[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = new Date(dashboardWeekStart);
              next.setDate(next.getDate() + 7);
              setDashboardWeekStart(next);
              setDashboardSelectedDate(new Date(next));
            }}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: 6,
              background: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            ›
          </button>
        </div>
      </div>
      <div className="calendar-strip" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {getWeekDates(dashboardWeekStart).map((day) => {
          const selected = isSameDay(day, dashboardSelectedDate);
          const today = isToday(day);
          return (
            <button
              type="button"
              key={day.getTime()}
              onClick={() => setDashboardSelectedDate(new Date(day))}
              className={`day-box ${today ? 'today' : ''}`}
              style={{
                flex: '1 1 52px',
                minWidth: 48,
                padding: '6px 4px',
                border: selected ? '2px solid var(--primary)' : '1px solid #e0e0e0',
                borderRadius: 8,
                background: selected ? 'rgba(13, 110, 253, 0.08)' : 'white',
                cursor: 'pointer',
                fontWeight: selected ? 600 : 400,
                boxShadow: selected ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                fontSize: '0.7rem',
              }}
            >
              <span style={{ fontSize: '0.65rem', color: '#666', display: 'block' }}>
                {dayNames[day.getDay()]}
              </span>
              <span style={{ fontSize: '1rem', display: 'block', marginTop: 2 }}>
                {day.getDate()}
              </span>
              <span style={{ fontSize: '0.6rem', color: '#999' }}>
                {day.toLocaleDateString('pt-BR', { month: 'short' })}
              </span>
            </button>
          );
        })}
      </div>

      <h3 style={{ marginBottom: 15 }}>
        Atividades do dia {dashboardSelectedDate ? new Date(dashboardSelectedDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : ''}
      </h3>
      <div className="list-container">
        {dashboardDayEventsLoading ? (
          <div className="list-item">
            <span>Carregando eventos...</span>
          </div>
        ) : dashboardDayEvents.length === 0 ? (
          <div className="list-item">
            <div style={{ textAlign: 'center', padding: 20, color: '#666', width: '100%' }}>
              <i className="fas fa-calendar-day" style={{ fontSize: '2em', marginBottom: 10, opacity: 0.3 }} />
              <p style={{ margin: 0 }}>Nenhum evento agendado para este dia.</p>
            </div>
          </div>
        ) : (
          dashboardDayEvents.map((event) => {
            const eventDate = new Date(event?.data_inicio);
            if (!event?.id || isNaN(eventDate.getTime())) return null;
            return (
              <div
                key={event.id}
                className="list-item"
                style={{
                  borderLeft: `4px solid ${event?.cor_etiqueta || '#3498DB'}`,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (onOpenEventDetail) {
                    onOpenEventDetail(event);
                    return;
                  }
                  setCurrentView('agenda');
                  setCurrentDate(eventDate);
                  setAgendaView('day');
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong>{event?.titulo || 'Sem título'}</strong>
                  {event?.descricao && (
                    <div style={{ fontSize: '0.8em', color: 'gray', marginTop: 4 }}>
                      {event.descricao}
                    </div>
                  )}
                </div>
                <span
                  className="badge"
                  style={{
                    background: event?.cor_etiqueta || '#3498DB',
                    color: 'white',
                  }}
                >
                  {eventDate.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DashboardView;
