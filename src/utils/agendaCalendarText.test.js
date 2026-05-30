import { describe, it, expect } from 'vitest';
import { maxTitleCharsForCellWidth, abbreviateEventTitle } from './agendaCalendarText';

describe('maxTitleCharsForCellWidth', () => {
  it('aumenta caracteres quando a célula é mais larga', () => {
    const narrow = maxTitleCharsForCellWidth(80, { compact: true, reserveTime: false });
    const wide = maxTitleCharsForCellWidth(160, { compact: true, reserveTime: false });
    expect(wide).toBeGreaterThan(narrow);
  });

  it('reserva espaço para horário na visão semanal', () => {
    const withTime = maxTitleCharsForCellWidth(120, { compact: false, reserveTime: true });
    const without = maxTitleCharsForCellWidth(120, { compact: false, reserveTime: false });
    expect(without).toBeGreaterThan(withTime);
  });
});

describe('abbreviateEventTitle', () => {
  it('adiciona reticências quando excede o limite', () => {
    expect(abbreviateEventTitle('Reunião de Pais', 8)).toBe('Reunião…');
  });
});
