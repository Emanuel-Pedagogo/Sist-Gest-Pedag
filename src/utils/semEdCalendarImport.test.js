import { describe, it, expect } from 'vitest';
import {
  getItensPadraoSelecionados,
  buildEventRowsFromSemedItens,
  filterAgendaEvents,
} from './semEdCalendarImport';

describe('semEdCalendarImport', () => {
  it('seleciona por padrão feriados e marcos, não avaliações', () => {
    const itens = getItensPadraoSelecionados();
    const aval = itens.filter((i) => i.tipo === 'avaliacao');
    expect(avali.every((i) => !i.selecionado)).toBe(true);
    const feriados = itens.filter((i) => i.tipo === 'feriado');
    expect(feriados.every((i) => i.selecionado)).toBe(true);
  });

  it('filtra marcos SEMED quando showSemed é false', () => {
    const events = [
      { id: 1, titulo: 'Reunião', origem: 'usuario' },
      { id: 2, titulo: 'Feriado', origem: 'sem_ed' },
    ];
    expect(filterAgendaEvents(events, { showSemed: false })).toHaveLength(1);
  });

  it('gera payloads com origem sem_ed', () => {
    const itens = getItensPadraoSelecionados().filter((i) => i.id === 'f-01-01');
    const rows = buildEventRowsFromSemedItens(itens, 'batch-1');
    expect(rows[0].origem).toBe('sem_ed');
    expect(rows[0].tipo_marco).toBe('feriado');
  });
});
