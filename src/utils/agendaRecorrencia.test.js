import { describe, it, expect } from 'vitest';
import {
  generateRecurringOccurrences,
  countRecurringOccurrences,
  parseLocalDate,
  inferRecorrenciaFromSerie,
} from './agendaRecorrencia';

describe('generateRecurringOccurrences', () => {
  it('retorna uma ocorrência quando não há recorrência', () => {
    const start = new Date(2026, 0, 10, 8, 0);
    const end = new Date(2026, 0, 10, 9, 0);
    const list = generateRecurringOccurrences({ start, end, tipo: 'nenhuma', ate: null });
    expect(list).toHaveLength(1);
  });

  it('gera ocorrências diárias até a data limite', () => {
    const start = new Date(2026, 0, 1, 8, 0);
    const end = new Date(2026, 0, 1, 9, 0);
    const ate = parseLocalDate('2026-01-03');
    const list = generateRecurringOccurrences({
      start,
      end,
      tipo: 'diaria',
      ate,
      incluirSabado: true,
      incluirDomingo: true,
    });
    expect(list).toHaveLength(3);
    expect(list[2].start.getDate()).toBe(3);
  });

  it('gera ocorrências semanais', () => {
    const start = new Date(2026, 0, 5, 10, 0);
    const end = new Date(2026, 0, 5, 11, 0);
    const ate = parseLocalDate('2026-01-19');
    const list = generateRecurringOccurrences({ start, end, tipo: 'semanal', ate });
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list[1].start.getDate()).toBe(12);
  });
});

describe('inferRecorrenciaFromSerie', () => {
  it('infere recorrência semanal a partir da série', () => {
    const serieId = 'abc-123';
    const allEvents = [
      { id: 1, serie_id: serieId, data_inicio: '2026-02-02T08:00:00' },
      { id: 2, serie_id: serieId, data_inicio: '2026-02-09T08:00:00' },
      { id: 3, serie_id: serieId, data_inicio: '2026-02-16T08:00:00' },
    ];
    const result = inferRecorrenciaFromSerie(allEvents[0], allEvents);
    expect(result.recorrencia_tipo).toBe('semanal');
    expect(result.recorrencia_ate).toBe('2026-02-16');
  });
});

describe('finais de semana na recorrência', () => {
  it('ignora sábados e domingos em recorrência diária quando desmarcado', () => {
    const start = new Date(2026, 1, 2, 8, 0);
    const end = new Date(2026, 1, 2, 9, 0);
    const ate = parseLocalDate('2026-02-09');
    const list = generateRecurringOccurrences({
      start,
      end,
      tipo: 'diaria',
      ate,
      incluirSabado: false,
      incluirDomingo: false,
    });
    const hasWeekend = list.some((o) => {
      const d = o.start.getDay();
      return d === 0 || d === 6;
    });
    expect(hasWeekend).toBe(false);
    expect(list.length).toBeGreaterThan(0);
  });

  it('sempre inclui a data de início mesmo sendo domingo', () => {
    const start = new Date(2026, 1, 1, 8, 0);
    expect(start.getDay()).toBe(0);
    const end = new Date(2026, 1, 1, 9, 0);
    const ate = parseLocalDate('2026-02-08');
    const list = generateRecurringOccurrences({
      start,
      end,
      tipo: 'diaria',
      ate,
      incluirSabado: false,
      incluirDomingo: false,
    });
    expect(list.some((o) => o.start.getDate() === 1 && o.start.getMonth() === 1)).toBe(true);
  });
});

describe('countRecurringOccurrences', () => {
  it('conta ocorrências a partir do formulário', () => {
    const n = countRecurringOccurrences({
      data_inicio: '2026-02-02',
      hora_inicio: '08:00',
      data_fim: '2026-02-02',
      hora_fim: '09:00',
      recorrencia_tipo: 'diaria',
      recorrencia_ate: '2026-02-06',
      incluir_sabado: true,
      incluir_domingo: true,
    });
    expect(n).toBe(5);
  });
});
