import React, { useState } from 'react';
import OnboardingChecklist from '../components/OnboardingChecklist';
import { isOnboardingVisible } from '../utils/onboarding';
import EtiquetaGlossarioButton from '../components/EtiquetaGlossario';
import { ETIQUETA_LABELS, ETIQUETA_COLORS } from '../utils/etiquetas';

const DashboardView = ({
  totalAzul,
  totalAtencao,
  totalRisco,
  totalVerde,
  totalRoxo,
  totalAlunos,
  classesCount,
  sondagemDone,
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
  const [showOnboarding, setShowOnboarding] = useState(isOnboardingVisible);

  const goToClasses = () => {
    setSelectedClassId(null);
    setSelectedClassName('');
    clearPersistedTurmaNav();
    setCurrentView('classes');
  };

  const goToStudents = () => {
    setSelectedClassId(null);
    setSelectedClassName('');
    clearPersistedTurmaNav();
    setFilterStudentTurmaId('');
    setFilterStudentEtiquetaCor('');
    setCurrentView('students');
  };

  const etiquetaCards = [
    { label: ETIQUETA_LABELS.azul, count: totalAzul, cor: 'azul', color: ETIQUETA_COLORS.azul },
    { label: ETIQUETA_LABELS.amarelo, count: totalAtencao, cor: 'amarelo', color: ETIQUETA_COLORS.amarelo },
    { label: ETIQUETA_LABELS.vermelho, count: totalRisco, cor: 'vermelho', color: ETIQUETA_COLORS.vermelho },
    { label: ETIQUETA_LABELS.verde, count: totalVerde, cor: 'verde', color: ETIQUETA_COLORS.verde },
    { label: ETIQUETA_LABELS.roxo, count: totalRoxo, cor: 'roxo', color: ETIQUETA_COLORS.roxo },
    { label: 'Total de Alunos', count: totalAlunos, cor: '', color: '#374151' },
  ];

  return (
    <div id="view-dashboard" className="view-section">
      {showOnboarding && (
        <OnboardingChecklist
          classesCount={classesCount}
          totalAlunos={totalAlunos}
          sondagemDone={sondagemDone}
          onGoToClasses={goToClasses}
          onGoToStudents={goToStudents}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}

      <div className="dashboard-etiquetas-header">
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Resumo por etiqueta</h3>
        <EtiquetaGlossarioButton compact />
      </div>

      <div className="dashboard-etiquetas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 20 }}>
        {etiquetaCards.map((item) => (
          <button
            type="button"
            key={item.cor || 'total'}
            onClick={() => {
              if (!item.cor) {
                goToStudents();
                return;
              }
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
            }}
            aria-label="Semana anterior"
          >
            <i className="fas fa-chevron-left" />
          </button>
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
            }}
            aria-label="Próxima semana"
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      </div>

      <div className="calendar-strip">
        {getWeekDates(dashboardWeekStart).map((date) => {
          const isSelected = isSameDay(date, dashboardSelectedDate);
          const today = isToday(date);
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => setDashboardSelectedDate(new Date(date))}
              className={`calendar-day${isSelected ? ' selected' : ''}${today ? ' today' : ''}`}
              style={{
                flex: '0 0 auto',
                minWidth: 52,
                padding: '8px 6px',
                border: isSelected ? '2px solid var(--primary)' : '1px solid #e0e0e0',
                borderRadius: 8,
                background: isSelected ? 'var(--primary-light, #e8f0fe)' : 'white',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>
                {dayNames[date.getDay()]}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: isSelected || today ? 700 : 500 }}>
                {date.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>
            Eventos do dia{' '}
            {dashboardSelectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </h3>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
            onClick={() => {
              setCurrentDate(dashboardSelectedDate);
              setAgendaView('day');
              setCurrentView('agenda');
            }}
          >
            Ver na agenda
          </button>
        </div>

        {dashboardDayEventsLoading ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Carregando eventos...</p>
        ) : dashboardDayEvents.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Nenhum evento neste dia.</p>
        ) : (
          <div className="list-container">
            {dashboardDayEvents.map((ev) => (
              <button
                key={ev.id}
                type="button"
                className="list-item"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => onOpenEventDetail(ev)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: ev.cor_etiqueta || '#3498db',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <strong>{ev.titulo}</strong>
                    <div style={{ fontSize: '0.8em', color: '#666' }}>
                      {new Date(ev.data_inicio).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {ev.data_fim &&
                        ` – ${new Date(ev.data_fim).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
