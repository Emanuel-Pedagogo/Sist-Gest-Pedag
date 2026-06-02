import { isSemedMarcoEvent } from '../utils/semEdCalendarImport';

export { useSemedAgenda, USUARIO_EVENT_EXTRAS } from './useSemedAgenda';
export { SemedAgendaBridge } from './SemedAgendaBridge';
export { default as AgendaSemedToolbar } from './AgendaSemedToolbar';
export { default as SemedCalendarImportWizard } from '../components/agenda/SemedCalendarImportWizard';
export { filterAgendaEvents, isSemedMarcoEvent } from '../utils/semEdCalendarImport';

/** Exportação do planejamento: período visível, sem marcos SEMED nem aniversários */
export function filterAgendaEventsForExport(agendaEvents, range) {
  return (agendaEvents || [])
    .filter((ev) => {
      if (!ev?.data_inicio || ev.tipo === 'aniversario' || isSemedMarcoEvent(ev)) return false;
      const t = new Date(ev.data_inicio).getTime();
      return t >= range.start.getTime() && t <= range.end.getTime();
    })
    .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
}
