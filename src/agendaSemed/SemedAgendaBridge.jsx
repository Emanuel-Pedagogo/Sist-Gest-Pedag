import React from 'react';
import SemedCalendarImportWizard from '../components/agenda/SemedCalendarImportWizard';
import { useSemedAgenda, USUARIO_EVENT_EXTRAS } from './useSemedAgenda';

/**
 * Conecta o assistente SEMED ao App em um único lugar.
 * Uso no App.jsx (dentro do return, junto dos modais):
 *
 * <SemedAgendaBridge
 *   currentView={currentView}
 *   agendaEvents={agendaEvents}
 *   loadAgendaEvents={loadAgendaEvents}
 *   supabase={supabase}
 *   escolaId={activeSchoolId}
 *   handleBackdropMouseDown={handleBackdropMouseDown}
 *   handleBackdropClick={handleBackdropClick}
 *   render={({ semed, agendaViewProps }) => (
 *     <>
 *       {currentView === 'agenda' && (
 *         <AgendaView {...agendaProps} {...agendaViewProps} />
 *       )}
 *     </>
 *   )}
 * />
 */
export function SemedAgendaBridge({
  currentView,
  agendaEvents,
  loadAgendaEvents,
  supabase,
  escolaId,
  handleBackdropMouseDown,
  handleBackdropClick,
  children,
}) {
  const semed = useSemedAgenda({ currentView, agendaEvents, loadAgendaEvents });

  const agendaViewProps = {
    agendaEvents: semed.filteredForView,
    onOpenSemedImport: () => semed.setShowSemedImportWizard(true),
    showSemedMarcos: semed.showSemedMarcos,
    setShowSemedMarcos: semed.setShowSemedMarcos,
    hasSemedImport: semed.hasSemedImport,
  };

  return (
    <>
      {typeof children === 'function' ? children({ semed, agendaViewProps }) : children}
      <SemedCalendarImportWizard
        open={semed.showSemedImportWizard}
        onClose={semed.closeWizard}
        supabase={supabase}
        escolaId={escolaId}
        onSuccess={semed.onImportSuccess}
        handleBackdropMouseDown={handleBackdropMouseDown}
        handleBackdropClick={handleBackdropClick}
      />
    </>
  );
}
