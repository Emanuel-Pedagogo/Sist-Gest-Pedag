import {
  getSemedCalendario2026ItensPadrao,
  semedItemToEventPayload,
  SEMED_CALENDARIO_META,
} from './semEdCalendar2026Santarem';

export { getSemedCalendario2026ItensPadrao, SEMED_CALENDARIO_META };

/** Agrupa itens para exibição no assistente */
export function groupSemedItensPorTipo(itens) {
  const order = ['referencia', 'marco_letivo', 'recesso', 'feriado', 'avaliacao', 'recomposicao'];
  const groups = {};
  for (const item of itens) {
    if (!groups[item.tipo]) groups[item.tipo] = [];
    groups[item.tipo].push(item);
  }
  return order.filter((t) => groups[t]).map((tipo) => ({ tipo, itens: groups[tipo] }));
}

/** Itens que vêm marcados por padrão (não poluir) */
export function getItensPadraoSelecionados() {
  return getSemedCalendario2026ItensPadrao().map((item) => ({
    ...item,
    selecionado:
      item.tipo === 'feriado' ||
      item.tipo === 'recesso' ||
      item.tipo === 'marco_letivo' ||
      item.tipo === 'referencia',
  }));
}

export function buildEventRowsFromSemedItens(itens, importBatchId) {
  return itens
    .filter((i) => i.selecionado)
    .map((item) => semedItemToEventPayload(item, { importBatchId }));
}

/**
 * Persiste marcos SEMED no Supabase.
 * @returns {{ count: number, importBatchId: string, error?: string }}
 */
export async function persistSemedImport(supabase, { itens, pdfFile }) {
  const importBatchId = crypto.randomUUID();
  const rows = buildEventRowsFromSemedItens(itens, importBatchId);

  if (rows.length === 0) {
    return { count: 0, importBatchId, error: 'Nenhum item selecionado.' };
  }

  let insertResult = await supabase.from('agenda_eventos').insert(rows).select();

  if (insertResult.error?.message?.includes('origem')) {
    const fallback = rows.map((row) => {
      const rest = { ...row };
      delete rest.origem;
      delete rest.tipo_marco;
      delete rest.import_batch_id;
      return rest;
    });
    insertResult = await supabase.from('agenda_eventos').insert(fallback).select();
  }

  if (insertResult.error) {
    return { count: 0, importBatchId, error: insertResult.error.message };
  }

  if (pdfFile) {
    const path = `sem-ed/${importBatchId}/calendario-oficial.pdf`;
    const { error: upErr } = await supabase.storage.from('agenda-arquivos').upload(path, pdfFile, {
      upsert: true,
    });
    if (!upErr && insertResult.data?.length) {
      const ref = insertResult.data.find((e) => e.titulo?.includes('Calendário Escolar SEMED'));
      if (ref) {
        const { data: urlData } = supabase.storage.from('agenda-arquivos').getPublicUrl(path);
        await supabase
          .from('agenda_eventos')
          .update({ anexo_url: urlData?.publicUrl, anexo_nome: pdfFile.name })
          .eq('id', ref.id);
      }
    }
  }

  return { count: insertResult.data?.length ?? rows.length, importBatchId };
}

export async function removeSemedImport(supabase, importBatchId) {
  if (importBatchId) {
    return supabase.from('agenda_eventos').delete().eq('import_batch_id', importBatchId);
  }
  return supabase.from('agenda_eventos').delete().eq('origem', 'sem_ed');
}

export function isSemedMarcoEvent(ev) {
  return ev?.origem === 'sem_ed' || ev?.tipo_marco;
}

export function filterAgendaEvents(events, { showSemed = true, onlyUsuario = false }) {
  return (events || []).filter((ev) => {
    if (ev.tipo === 'aniversario') return true;
    const semed = isSemedMarcoEvent(ev);
    if (onlyUsuario) return !semed;
    if (!showSemed && semed) return false;
    return true;
  });
}
