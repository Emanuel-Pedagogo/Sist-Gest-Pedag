const GRID_COLUMNS = 7;

/** Largura reservada para "22:30 " no chip da visão semanal */
const TIME_PREFIX_SAMPLE = '22:30 ';

let measureCanvas;

function getRootFontSizePx() {
  if (typeof document === 'undefined') return 16;
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(px) ? px : 16;
}

function getChipFont(compact) {
  const sizePx = (compact ? 0.68 : 0.72) * getRootFontSizePx();
  return `400 ${sizePx}px system-ui, -apple-system, "Segoe UI", sans-serif`;
}

export function measureTextWidth(text, font) {
  if (typeof document === 'undefined') return String(text).length * 6;
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  ctx.font = font;
  return ctx.measureText(text).width;
}

/**
 * Quantos caracteres do título cabem na largura de uma célula do calendário.
 * @param {number} cellWidthPx - largura interna da coluna do dia
 * @param {{ compact?: boolean, reserveTime?: boolean }} options
 */
export function maxTitleCharsForCellWidth(cellWidthPx, options = {}) {
  const { compact = true, reserveTime = false } = options;

  if (!cellWidthPx || cellWidthPx < 20) {
    return compact ? 8 : 12;
  }

  const font = getChipFont(compact);
  const cellPadding = compact ? 12 : 16;
  const chipPadding = 10;
  const available = cellWidthPx - cellPadding - chipPadding;

  if (available <= 12) return 4;

  let reserved = 0;
  if (reserveTime) {
    reserved = measureTextWidth(TIME_PREFIX_SAMPLE, font);
  }

  const ellipsisW = measureTextWidth('…', font);
  const sample = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const avgCharW = measureTextWidth(sample, font) / sample.length;

  if (avgCharW <= 0) return compact ? 10 : 16;

  const titleSpace = available - reserved - ellipsisW;
  return Math.max(4, Math.floor(titleSpace / avgCharW));
}

export function maxTitleCharsForGridWidth(gridWidthPx, options = {}) {
  const cellWidth = gridWidthPx / GRID_COLUMNS;
  return maxTitleCharsForCellWidth(cellWidth, options);
}

export function abbreviateEventTitle(title, maxLen) {
  const t = (title || '').trim();
  if (!t) return '—';
  if (maxLen < 1 || t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}
