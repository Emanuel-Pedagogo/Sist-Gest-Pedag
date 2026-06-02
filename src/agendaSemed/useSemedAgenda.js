import { useEffect, useMemo, useState } from 'react';
import { filterAgendaEvents } from '../utils/semEdCalendarImport';

const STORAGE_KEY = 'sacp_semed_import_done';

export const USUARIO_EVENT_EXTRAS = {
  origem: 'usuario',
  tipo_marco: null,
  import_batch_id: null,
};

export function useSemedAgenda({ currentView, agendaEvents, loadAgendaEvents }) {
  const [showSemedImportWizard, setShowSemedImportWizard] = useState(false);
  const [showSemedMarcos, setShowSemedMarcos] = useState(true);

  const hasSemedImport = useMemo(
    () => (agendaEvents || []).some((e) => e.origem === 'sem_ed'),
    [agendaEvents]
  );

  const filteredForView = useMemo(
    () => filterAgendaEvents(agendaEvents, { showSemed: showSemedMarcos }),
    [agendaEvents, showSemedMarcos]
  );

  useEffect(() => {
    if (currentView !== 'agenda') return undefined;
    if (localStorage.getItem(STORAGE_KEY)) return undefined;
    if (hasSemedImport) {
      localStorage.setItem(STORAGE_KEY, '1');
      return undefined;
    }
    const timer = setTimeout(() => setShowSemedImportWizard(true), 500);
    return () => clearTimeout(timer);
  }, [currentView, hasSemedImport]);

  const closeWizard = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShowSemedImportWizard(false);
  };

  const onImportSuccess = async () => {
    localStorage.setItem(STORAGE_KEY, '1');
    if (loadAgendaEvents) await loadAgendaEvents();
  };

  return {
    showSemedImportWizard,
    setShowSemedImportWizard,
    closeWizard,
    showSemedMarcos,
    setShowSemedMarcos,
    filteredForView,
    hasSemedImport,
    onImportSuccess,
  };
}
