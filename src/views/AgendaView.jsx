import React, { useState } from 'react';
import { INITIAL_EVENT_FORM_DATA, ETIQUETA_CORES, getEventColor } from '../utils/agendaConstants';
import ExportAgendaModal from '../components/modals/ExportAgendaModal';
import { getAgendaExportRange } from '../utils/agendaExport';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const getSundayWeekStart = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const getWeekDaysFromDate = (date) => {
  const start = getSundayWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
};

const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isToday = (d) => isSameCalendarDay(d, new Date());

const formatDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const navBtnStyle = {
  padding: '6px 10px',
  border: '1px solid #ddd',
  borderRadius: 6,
  background: 'white',
  cursor: 'pointer',
  fontSize: '1em',
  lineHeight: 1,
};

const viewTabStyle = (active) => ({
  padding: '8px 16px',
  border: '1px solid #ddd',
  borderRadius: 6,
  background: active ? 'var(--primary)' : 'white',
  color: active ? 'white' : '#333',
  cursor: 'pointer',
});

const AgendaView = ({
  agendaView,
  setAgendaView,
  setEditingEvent,
  setEventFormData,
  setShowEventModal,
  onOpenEventDetail,
  currentDate,
  setCurrentDate,
  agendaEvents,
  getBirthdayEventsForDay,
  splitDateTime,
  onExportPDF,
  onExportWord,
  exportingAgenda,
  handleBackdropMouseDown,
  handleBackdropClick,
}) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const exportPeriodLabel = getAgendaExportRange(agendaView, currentDate).label;

  const showEventTooltip = (ev, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredEvent(ev);
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const hideEventTooltip = () => setHoveredEvent(null);

  const openNewEventModal = (dateStr, horaInicio = '08:00', horaFim = '09:00') => {
    setEditingEvent(null);
    setEventFormData({
      ...INITIAL_EVENT_FORM_DATA,
      data_inicio: dateStr,
      hora_inicio: horaInicio,
      data_fim: dateStr,
      hora_fim: horaFim,
    });
    setShowEventModal(true);
  };

  const getEventsForDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dayAgendaEvents = agendaEvents.filter((ev) => {
      if (!ev.data_inicio) return false;
      const evDate = new Date(ev.data_inicio);
      return evDate.getFullYear() === year && evDate.getMonth() === month && evDate.getDate() === day;
    });
    const dayBirthdays = getBirthdayEventsForDay(year, month, day);
    return [...dayAgendaEvents, ...dayBirthdays].sort((a, b) => {
      const ta = new Date(a.data_inicio).getTime();
      const tb = new Date(b.data_inicio).getTime();
      return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
    });
  };

  const renderEventChip = (ev, showTime = false) => {
    const inicio = splitDateTime(ev.data_inicio);
    const cor = getEventColor(ev);
    const isAniversario = ev.tipo === 'aniversario';
    const timeLabel = showTime && inicio.time ? `${inicio.time} ` : '';

    return (
      <div
        key={ev.id}
        className={`agenda-event-chip ${isAniversario ? 'agenda-event-chip--static' : 'agenda-event-chip--interactive'}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isAniversario) return;
          onOpenEventDetail(ev);
        }}
        onMouseEnter={(e) => showEventTooltip(ev, e)}
        onMouseLeave={hideEventTooltip}
        style={{ background: cor }}
      >
        {timeLabel}
        {ev.titulo}
      </div>
    );
  };

  const renderDayCell = (date, { compact = false } = {}) => {
    const day = date.getDate();
    const dayEvents = getEventsForDate(date);
    const dateStr = formatDateStr(date);
    const today = isToday(date);

    return (
      <div
        key={dateStr}
        className={`agenda-day-cell ${compact ? 'agenda-day-cell--compact' : 'agenda-day-cell--week'}${today ? ' agenda-day-cell--today' : ''}`}
        onClick={() => openNewEventModal(dateStr)}
      >
        <span
          style={{
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 26,
            minHeight: 26,
            borderRadius: '50%',
            background: today ? 'var(--primary)' : 'transparent',
            color: today ? 'white' : '#333',
            fontSize: compact ? '0.85rem' : '0.9rem',
            padding: today ? '2px 6px' : 0,
            flexShrink: 0,
          }}
        >
          {day}
        </span>
        {!compact && (
          <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#888', fontWeight: 500 }}>
            {DAY_NAMES_SHORT[date.getDay()]}
          </span>
        )}
        <div className="agenda-day-cell__events">
          {dayEvents.map((ev) => renderEventChip(ev, agendaView !== 'month'))}
        </div>
      </div>
    );
  };

  const goPrevious = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const d = currentDate.getDate();
    if (agendaView === 'month') {
      setCurrentDate(new Date(y, m - 1, 1));
    } else if (agendaView === 'week') {
      setCurrentDate(new Date(y, m, d - 7));
    } else {
      setCurrentDate(new Date(y, m, d - 1));
    }
  };

  const goNext = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const d = currentDate.getDate();
    if (agendaView === 'month') {
      setCurrentDate(new Date(y, m + 1, 1));
    } else if (agendaView === 'week') {
      setCurrentDate(new Date(y, m, d + 7));
    } else {
      setCurrentDate(new Date(y, m, d + 1));
    }
  };

  const goToday = () => {
    const hoje = new Date();
    if (agendaView === 'month') {
      setCurrentDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    } else {
      setCurrentDate(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
    }
  };

  const getNavTitle = () => {
    if (agendaView === 'month') {
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    if (agendaView === 'week') {
      const days = getWeekDaysFromDate(currentDate);
      const start = days[0];
      const end = days[6];
      const sameYear = start.getFullYear() === end.getFullYear();
      const sameMonth = sameYear && start.getMonth() === end.getMonth();
      const startStr = start.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: sameMonth ? 'short' : 'short',
        year: sameYear ? undefined : 'numeric',
      });
      const endStr = end.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return `${startStr} – ${endStr}`;
    }
    return currentDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const slots = [];

    for (let i = 0; i < firstDay; i++) {
      slots.push(
        <div
          key={`empty-${i}`}
          className="agenda-day-cell agenda-day-cell--empty agenda-day-cell--compact"
        />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      slots.push(renderDayCell(new Date(year, month, day), { compact: true }));
    }

    return slots;
  };

  const renderWeekGrid = () => {
    const weekDays = getWeekDaysFromDate(currentDate);
    return weekDays.map((date) => renderDayCell(date, { compact: false }));
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const dateStr = formatDateStr(currentDate);
    const today = isToday(currentDate);

    return (
      <div style={{ padding: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', textTransform: 'capitalize' }}>
              {currentDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
            </p>
            <h3 style={{ margin: '4px 0 0', color: today ? 'var(--primary)' : '#333' }}>
              {currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => openNewEventModal(dateStr)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              border: 'none',
              borderRadius: 6,
              background: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <i className="fas fa-plus" /> Novo evento neste dia
          </button>
        </div>

        {dayEvents.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 48,
              color: '#888',
              background: '#fafafa',
              borderRadius: 8,
              border: '1px dashed #ddd',
            }}
          >
            <i className="fas fa-calendar-day" style={{ fontSize: '2.5rem', opacity: 0.25, marginBottom: 12 }} />
            <p style={{ margin: 0 }}>Nenhum evento neste dia.</p>
            <p style={{ margin: '8px 0 0', fontSize: '0.9em' }}>Clique em &quot;Novo evento neste dia&quot; para agendar.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dayEvents.map((ev) => {
              const inicio = splitDateTime(ev.data_inicio);
              const fim = ev.data_fim ? splitDateTime(ev.data_fim) : inicio;
              const cor = getEventColor(ev);
              const isAniversario = ev.tipo === 'aniversario';
              const horario =
                inicio.time && fim.time && inicio.time !== fim.time
                  ? `${inicio.time} – ${fim.time}`
                  : inicio.time || '—';

              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    if (!isAniversario) onOpenEventDetail(ev);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: 14,
                    padding: 14,
                    background: 'white',
                    borderRadius: 8,
                    border: '1px solid #eee',
                    borderLeft: `4px solid ${cor}`,
                    cursor: isAniversario ? 'default' : 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    style={{
                      minWidth: 72,
                      textAlign: 'center',
                      fontWeight: 600,
                      color: cor,
                      fontSize: '0.9rem',
                      paddingTop: 2,
                    }}
                  >
                    {horario}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#333' }}>{ev.titulo}</strong>
                    {ev.descricao && (
                      <p style={{ margin: '6px 0 0', fontSize: '0.85em', color: '#666' }}>
                        <span style={{ fontSize: '0.75em', color: '#999' }}>Obs.: </span>
                        {ev.descricao}
                      </p>
                    )}
                  </div>
                  {!isAniversario && (
                    <i className="fas fa-chevron-right" style={{ color: '#ccc', alignSelf: 'center' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const showWeekdayHeader = agendaView === 'month' || agendaView === 'week';

  return (
    <div id="view-agenda" className="view-section">
      <div className="agenda-view-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => setAgendaView('month')} style={viewTabStyle(agendaView === 'month')}>
            Mês
          </button>
          <button
            type="button"
            onClick={() => {
              setAgendaView('week');
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
            }}
            style={viewTabStyle(agendaView === 'week')}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => {
              setAgendaView('day');
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
            }}
            style={viewTabStyle(agendaView === 'day')}
          >
            Dia
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            disabled={exportingAgenda}
            title="Exportar planejamento do período visível"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '8px 10px',
              border: '1px solid #ddd',
              borderRadius: 6,
              background: 'white',
              cursor: exportingAgenda ? 'wait' : 'pointer',
              fontSize: '0.8rem',
            }}
          >
            <i className="fas fa-file-export" style={{ color: '#555' }} />
            {exportingAgenda ? 'Exportando...' : 'Exportar'}
          </button>
          <button
            type="button"
            onClick={() => {
              const hoje = new Date();
              openNewEventModal(formatDateStr(hoje));
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
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={goPrevious}
          style={navBtnStyle}
          aria-label={
            agendaView === 'month' ? 'Mês anterior' : agendaView === 'week' ? 'Semana anterior' : 'Dia anterior'
          }
        >
          &lt;
        </button>
        <h3
          style={{
            margin: 0,
            textTransform: agendaView === 'day' ? 'none' : 'uppercase',
            letterSpacing: '0.03em',
            color: '#333',
            fontSize: '1rem',
            textAlign: 'center',
            flex: 1,
          }}
        >
          {getNavTitle()}
        </h3>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            onClick={goToday}
            style={{
              ...navBtnStyle,
              fontSize: '0.8rem',
              padding: '6px 12px',
              color: 'var(--primary)',
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={goNext}
            style={navBtnStyle}
            aria-label={agendaView === 'month' ? 'Próximo mês' : agendaView === 'week' ? 'Próxima semana' : 'Próximo dia'}
          >
            &gt;
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px 16px',
          marginBottom: 10,
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #eee',
          fontSize: '0.75rem',
          color: '#555',
        }}
      >
        {ETIQUETA_CORES.map((cat) => (
          <span key={cat.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: cat.color,
                flexShrink: 0,
              }}
            />
            {cat.label}
          </span>
        ))}
      </div>

      <ExportAgendaModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportPDF={(ids) => {
          setShowExportModal(false);
          onExportPDF(ids);
        }}
        onExportWord={(ids) => {
          setShowExportModal(false);
          onExportWord(ids);
        }}
        exporting={exportingAgenda}
        periodLabel={exportPeriodLabel}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
      />

      <div className="agenda-calendar-card" style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {agendaView === 'day' ? (
          renderDayView()
        ) : (
          <>
            {showWeekdayHeader && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  background: '#f8f9fa',
                  borderBottom: '1px solid #eee',
                }}
              >
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    style={{
                      padding: '8px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#666',
                      fontSize: agendaView === 'week' ? '0.8rem' : '0.85rem',
                    }}
                  >
                    {agendaView === 'week' ? d.slice(0, 3) : d}
                  </div>
                ))}
              </div>
            )}
            <div
              className={`agenda-calendar-grid agenda-calendar-grid--${agendaView === 'month' ? 'month' : 'week'}`}
            >
              {agendaView === 'month' ? renderMonthGrid() : renderWeekGrid()}
            </div>
          </>
        )}
      </div>

      {hoveredEvent && (
        <div
          className="agenda-event-floating-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
          role="tooltip"
        >
          <span className="agenda-event-floating-tooltip__title">{hoveredEvent.titulo}</span>
          {hoveredEvent.descricao?.trim() ? (
            <p className="agenda-event-floating-tooltip__obs">
              <span className="agenda-event-floating-tooltip__obs-label">Obs.: </span>
              {hoveredEvent.descricao.trim()}
            </p>
          ) : (
            <p className="agenda-event-floating-tooltip__obs">
              <span className="agenda-event-floating-tooltip__obs-label">Sem observação.</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AgendaView;
