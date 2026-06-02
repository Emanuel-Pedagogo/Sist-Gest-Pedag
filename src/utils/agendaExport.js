import { saveBlob, savePdfDocument } from './nativeExport';
import {
  ETIQUETA_CORES,
  ALL_ETIQUETA_IDS,
  getEventColor,
  getEventCategoryId,
} from './agendaConstants';
import { isSemedMarcoEvent } from './semEdCalendarImport';

export const SEMED_EXPORT_LEGEND = {
  id: 'sem_ed',
  label: 'Calendário SEMED',
  color: '#9ca3af',
};

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const getSundayWeekStart = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const formatDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

const hexToDocxFill = (hex) => hex.replace('#', '').toUpperCase();

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

// No PDF, escurecemos um pouco as cores para aumentar contraste com texto branco.
function pdfRgbFromHex(hex, factor = 0.78) {
  const [r, g, b] = hexToRgb(hex);
  return [clampByte(r * factor), clampByte(g * factor), clampByte(b * factor)];
}

const PDF_DAY_HEADER_H = 3.8;
const PDF_MIN_ROW_H = 9;
const PDF_PT_TO_MM = 0.352778;
const PDF_EVENT_GAP = 0.35;

/** Tamanhos base dos eventos no PDF (pt) — legíveis na célula do calendário */
const PDF_FONT_EVENT = {
  time: 6,
  title: 7.5,
  obs: 6,
  day: 6.5,
  weekday: 6,
};

function pdfLineHeightMm(fontSizePt) {
  return fontSizePt * PDF_PT_TO_MM * 1.06;
}

function buildPdfEventLines(ev, doc, maxW, compact) {
  const c = Math.max(0.88, Math.min(1, compact));
  const title = (ev.titulo || '—').trim();
  const timeLabel = formatEventTimeLabel(ev);
  const obs = (ev.descricao || '').trim();
  const textW = maxW - 1.4;
  const lines = [];

  if (timeLabel) {
    lines.push({ text: timeLabel, size: PDF_FONT_EVENT.time * c, bold: false });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONT_EVENT.title * c);
  const titlePart = doc.splitTextToSize(title, textW)[0] || '—';
  lines.push({ text: titlePart, size: PDF_FONT_EVENT.title * c, bold: true });

  if (obs && c >= 0.88) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_FONT_EVENT.obs * c);
    const obsPart = doc.splitTextToSize(obs, textW)[0];
    if (obsPart) lines.push({ text: obsPart, size: PDF_FONT_EVENT.obs * c, bold: false });
  }

  return lines;
}

function measurePdfEventBlock(doc, maxW, lines, compact) {
  const padV = 0.5 * Math.max(0.88, Math.min(1, compact));
  const padH = 0.7;
  let contentW = 0;
  let contentH = 0;

  for (const line of lines) {
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    doc.setFontSize(line.size);
    contentW = Math.max(contentW, doc.getTextWidth(line.text));
    contentH += pdfLineHeightMm(line.size);
  }

  return {
    lines,
    // Preencher horizontalmente a célula do dia (largura fixa).
    // Antes: o bloco “encolhia” conforme o texto, causando larguras diferentes.
    blockW: Math.max(0, maxW - 0.2),
    blockH: contentH + padV * 2,
    padV,
    padH,
  };
}

/** Horário de início/fim para exportação (pt-BR) */
export function formatEventTimeLabel(ev) {
  if (ev?.tipo === 'aniversario' || !ev?.data_inicio) return null;
  const start = new Date(ev.data_inicio);
  if (Number.isNaN(start.getTime())) return null;

  const pad = (n) => String(n).padStart(2, '0');
  const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;

  if (ev.data_fim) {
    const end = new Date(ev.data_fim);
    if (!Number.isNaN(end.getTime())) {
      const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
      if (startStr !== endStr) return `${startStr} – ${endStr}`;
    }
  }

  if (start.getHours() === 0 && start.getMinutes() === 0) return null;
  return startStr;
}

function formatExportPeriodTitle(periodLabel, agendaView) {
  if (!periodLabel) return '';
  if (agendaView === 'day') {
    return periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
  }
  return periodLabel.toUpperCase();
}

function drawPdfPeriodTitle(doc, periodLabel, agendaView, y) {
  const pageW = 297;
  const title = formatExportPeriodTitle(periodLabel, agendaView);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(agendaView === 'day' ? 11 : 13);
  doc.setTextColor(51, 51, 51);
  if (agendaView !== 'day') {
    doc.setCharSpace(0.4);
  }
  doc.text(title, pageW / 2, y, { align: 'center' });
  doc.setCharSpace(0);

  return y + 4;
}

/** Período visível na agenda para exportação */
export function getAgendaExportRange(agendaView, currentDate) {
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const d = currentDate.getDate();

  if (agendaView === 'month') {
    return {
      start: new Date(y, m, 1, 0, 0, 0),
      end: new Date(y, m + 1, 0, 23, 59, 59),
      label: currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    };
  }

  if (agendaView === 'week') {
    const weekStart = getSundayWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const label = `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    return { start: weekStart, end: weekEnd, label };
  }

  const dayStart = new Date(y, m, d, 0, 0, 0);
  const dayEnd = new Date(y, m, d, 23, 59, 59);
  return {
    start: dayStart,
    end: dayEnd,
    label: currentDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  };
}

export function getEventsForExport(
  agendaEvents,
  range,
  selectedCategoryIds,
  getBirthdayEventsForDay,
  { includeSemedMarcos = false } = {}
) {
  const ids = selectedCategoryIds?.length ? selectedCategoryIds : ALL_ETIQUETA_IDS;
  const idSet = new Set(ids);

  const dbEvents = (agendaEvents || []).filter((ev) => {
    if (!ev?.data_inicio || ev.tipo === 'aniversario') return false;
    const t = new Date(ev.data_inicio).getTime();
    if (t < range.start.getTime() || t > range.end.getTime()) return false;
    if (includeSemedMarcos && isSemedMarcoEvent(ev)) return true;
    return idSet.has(getEventCategoryId(ev));
  });

  const birthdayEvents = [];
  if (idSet.has('aniversario') && getBirthdayEventsForDay) {
    const cursor = new Date(range.start);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(range.end);
    end.setHours(23, 59, 59, 999);
    while (cursor <= end) {
      birthdayEvents.push(
        ...getBirthdayEventsForDay(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      );
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return [...dbEvents, ...birthdayEvents].sort(
    (a, b) => new Date(a.data_inicio) - new Date(b.data_inicio)
  );
}

/** @deprecated use getEventsForExport */
export function filterEventsForExport(agendaEvents, range) {
  return getEventsForExport(agendaEvents, range, ALL_ETIQUETA_IDS, null);
}

function groupEventsByDate(events) {
  const map = new Map();
  for (const ev of events) {
    const key = formatDateKey(new Date(ev.data_inicio));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(ev);
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
  }
  return map;
}

function buildCalendarSlots(agendaView, currentDate) {
  if (agendaView === 'week') {
    const start = getSundayWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  if (agendaView === 'day') {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    return [d];
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const slots = [];
  for (let i = 0; i < firstDay; i++) slots.push(null);
  for (let day = 1; day <= daysInMonth; day++) slots.push(new Date(year, month, day));
  while (slots.length % 7 !== 0) slots.push(null);
  return slots;
}

function getLegendCategories(selectedCategoryIds, includeSemedMarcos = false) {
  const ids = selectedCategoryIds?.length ? selectedCategoryIds : ALL_ETIQUETA_IDS;
  const categories = ETIQUETA_CORES.filter((e) => ids.includes(e.id));
  if (includeSemedMarcos) {
    return [...categories, SEMED_EXPORT_LEGEND];
  }
  return categories;
}

function chunkLegendCategories(categories, perLine = 3) {
  const chunks = [];
  for (let i = 0; i < categories.length; i += perLine) {
    chunks.push(categories.slice(i, i + perLine));
  }
  return chunks;
}

function measurePdfLegendItemWidth(doc, cat) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  return 3.5 + doc.getTextWidth(cat.label) + 5;
}

function drawPdfLegendLineRight(doc, rightX, y, items) {
  if (!items?.length) return;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const widths = items.map((cat) => measurePdfLegendItemWidth(doc, cat));
  const total = widths.reduce((a, b) => a + b, 0);
  let x = rightX - total;
  items.forEach((cat, i) => {
    const rgb = pdfRgbFromHex(cat.color);
    doc.setFillColor(...rgb);
    doc.rect(x, y - 2.2, 2.5, 2.5, 'F');
    doc.setTextColor(55, 55, 55);
    doc.text(cat.label, x + 3.5, y);
    x += widths[i];
  });
}

/** Cabeçalho compacto: metadados à esquerda, legenda (3 cores/linha) à direita */
function drawPdfExportHeader(doc, meta) {
  const margin = 8;
  const pageW = 297;
  const rightX = pageW - margin;
  const lineH = 4.2;
  let y = 10;

  const metaLines = [
    { text: 'Planejamento Pedagógico', bold: true, size: 12, color: [30, 30, 30] },
  ];
  if (meta.schoolName) {
    metaLines.push({ text: `Escola: ${meta.schoolName}`, size: 7.5, color: [60, 60, 60] });
  }
  if (meta.userName) {
    metaLines.push({
      text: `Coordenador Pedagógico: ${meta.userName}`,
      size: 7.5,
      color: [60, 60, 60],
    });
  }
  metaLines.push({
    text: `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    size: 7.5,
    color: [60, 60, 60],
  });

  const legendChunks = chunkLegendCategories(
    getLegendCategories(meta.selectedCategoryIds, meta.includeSemedMarcos),
    3
  );
  const rowCount = Math.max(metaLines.length, legendChunks.length);

  for (let i = 0; i < rowCount; i++) {
    const ml = metaLines[i];
    if (ml) {
      doc.setFont('helvetica', ml.bold ? 'bold' : 'normal');
      doc.setFontSize(ml.size);
      doc.setTextColor(...ml.color);
      doc.text(ml.text, margin, y);
    }
    if (legendChunks[i]) {
      drawPdfLegendLineRight(doc, rightX, y, legendChunks[i]);
    }
    y += lineH;
  }

  return y + 1;
}

function getPdfEventBlockLayout(doc, maxW, ev, compact = 1) {
  const lines = buildPdfEventLines(ev, doc, maxW, compact);
  return measurePdfEventBlock(doc, maxW, lines, compact);
}

function drawPdfEventBlock(doc, x, y, maxW, ev, compact = 1) {
  const color = getEventColor(ev);
  const rgb = pdfRgbFromHex(color);
  const lines = buildPdfEventLines(ev, doc, maxW, compact);
  const { blockW, blockH, padV, padH } = measurePdfEventBlock(doc, maxW, lines, compact);

  doc.setFillColor(...rgb);
  doc.roundedRect(x, y, blockW, blockH, 0.2, 0.2, 'F');

  doc.setTextColor(255, 255, 255);
  let cursorY = y + padV;

  for (const line of lines) {
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    doc.setFontSize(line.size);
    const lineH = pdfLineHeightMm(line.size);
    const baseline = cursorY + line.size * PDF_PT_TO_MM * 0.82;
    doc.text(line.text, x + padH, baseline);
    cursorY += lineH;
  }

  return blockH + PDF_EVENT_GAP;
}

function measurePdfDayContentHeight(doc, dayEvents, cellW, compact = 1) {
  const maxW = cellW - 2;
  let h = PDF_DAY_HEADER_H;
  for (const ev of dayEvents) {
    h += getPdfEventBlockLayout(doc, maxW, ev, compact).blockH + PDF_EVENT_GAP;
  }
  return h;
}

function computePdfRowHeights(doc, slots, cols, eventsByDate, cellW, availableH) {
  const rows = Math.ceil(slots.length / cols);
  let compact = 1;

  const measureRows = () => {
    const heights = [];
    for (let r = 0; r < rows; r++) {
      let maxH = PDF_MIN_ROW_H;
      for (let c = 0; c < cols; c++) {
        const date = slots[r * cols + c];
        if (!date) continue;
        const dayEvents = eventsByDate.get(formatDateKey(date)) || [];
        maxH = Math.max(maxH, measurePdfDayContentHeight(doc, dayEvents, cellW, compact));
      }
      heights.push(maxH);
    }
    return heights;
  };

  let heights = measureRows();
  let total = heights.reduce((a, b) => a + b, 0);
  if (total > availableH && total > 0) {
    compact = Math.max(0.88, availableH / total);
    heights = measureRows();
  }

  return { rowHeights: heights, compact };
}

function drawPdfCalendarGrid(doc, meta, eventsByDate, startY) {
  const { agendaView, currentDate } = meta;
  const slots = buildCalendarSlots(agendaView, currentDate);
  const cols = agendaView === 'day' ? 1 : 7;
  const rows = Math.ceil(slots.length / cols);

  const margin = 8;
  const pageW = 297;
  const gridTop = startY;
  const gridBottom = 208;
  const gridW = pageW - margin * 2;
  const cellW = gridW / cols;
  const eventInsetX = 0.6; // margem mínima: blocos “cheios” na horizontal
  const headerH = agendaView === 'day' ? 0 : 5;
  const bodyTop = gridTop + headerH;
  const availableBodyH = gridBottom - bodyTop;

  const { rowHeights, compact } = computePdfRowHeights(
    doc,
    slots,
    cols,
    eventsByDate,
    cellW,
    availableBodyH
  );

  if (agendaView !== 'day') {
    doc.setFillColor(248, 249, 250);
    doc.rect(margin, gridTop, gridW, headerH, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setFontSize(PDF_FONT_EVENT.weekday);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'bold');
    for (let c = 0; c < cols; c++) {
      const hx = margin + c * cellW;
      doc.rect(hx, gridTop, cellW, headerH);
      doc.text(DAY_NAMES[c], hx + cellW / 2, gridTop + 3.5, { align: 'center' });
    }
  }

  let rowY = bodyTop;

  for (let row = 0; row < rows; row++) {
    const cellH = rowHeights[row];

    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const x = margin + col * cellW;
      const y = rowY;

      doc.setDrawColor(220, 220, 220);
      doc.rect(x, y, cellW, cellH);

      const date = slots[i];
      if (!date) continue;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(PDF_FONT_EVENT.day);
      doc.setTextColor(80, 80, 80);
      const dayLabel =
        agendaView === 'week'
          ? `${date.getDate()} ${DAY_NAMES_SHORT[date.getDay()]}`
          : String(date.getDate());
      doc.text(dayLabel, x + 1.5, y + 2.2);

      const dayEvents = eventsByDate.get(formatDateKey(date)) || [];
      let ey = y + PDF_DAY_HEADER_H;
      const maxEventW = cellW - eventInsetX * 2;
      const maxY = y + cellH - 0.5;

      for (const ev of dayEvents) {
        if (ey >= maxY - 2) break;
        const blockH = drawPdfEventBlock(doc, x + eventInsetX, ey, maxEventW, ev, compact);
        ey += blockH;
      }
    }

    rowY += cellH;
  }
}

export async function exportAgendaPDF(events, meta) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  let y = drawPdfExportHeader(doc, meta);
  y = drawPdfPeriodTitle(doc, meta.periodLabel, meta.agendaView, y);

  const eventsByDate = groupEventsByDate(events);
  drawPdfCalendarGrid(doc, meta, eventsByDate, y);

  const safeLabel = (meta.periodLabel || 'planejamento')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .slice(0, 40);
  await savePdfDocument(doc, `planejamento-${safeLabel}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function buildWordEventParagraphs(ev, docx) {
  const { Paragraph, TextRun, LineRuleType } = docx;
  const color = getEventColor(ev);
  const fill = hexToDocxFill(color);
  const title = (ev.titulo || '—').trim();
  const obs = (ev.descricao || '').trim();
  const timeLabel = formatEventTimeLabel(ev);
  const runBase = { color: 'FFFFFF', shading: { fill, type: 'clear' } };

  const children = [];
  if (timeLabel) {
    children.push(new TextRun({ text: `${timeLabel} `, size: 18, ...runBase }));
  }
  children.push(new TextRun({ text: title, bold: true, size: 22, ...runBase }));
  if (obs) {
    const shortObs = obs.length > 80 ? `${obs.slice(0, 77)}…` : obs;
    children.push(new TextRun({ text: ` — ${shortObs}`, size: 18, ...runBase }));
  }

  return new Paragraph({
    children,
    spacing: { before: 0, after: 24, line: 240, lineRule: LineRuleType.EXACT },
  });
}

function buildWordDayCell(date, dayEvents, docx, { wide = false } = {}) {
  const { Paragraph, TableCell, TextRun, WidthType } = docx;
  const children = [];

  if (date) {
    const dayText = wide
      ? `${date.getDate()} — ${DAY_NAMES[date.getDay()]}`
      : String(date.getDate());
    children.push(
      new Paragraph({
        children: [new TextRun({ text: dayText, bold: true, size: 16, color: '555555' })],
        spacing: { after: 32, line: 240 },
      })
    );
    for (const ev of dayEvents) {
      children.push(buildWordEventParagraphs(ev, docx));
    }
  }

  return new TableCell({
    children: children.length ? children : [new Paragraph({ text: '' })],
    width: wide ? { size: 100, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: 'top',
  });
}

function buildWordLegendRuns(categories, TextRun) {
  return categories.flatMap((cat, i) => [
    ...(i > 0 ? [new TextRun({ text: '   ', size: 14 })] : []),
    new TextRun({ text: '■ ', color: hexToDocxFill(cat.color), size: 14 }),
    new TextRun({ text: cat.label, size: 14 }),
  ]);
}

function buildWordExportHeaderTable(meta, docx) {
  const {
    Table,
    TableRow,
    TableCell,
    Paragraph,
    TextRun,
    WidthType,
    BorderStyle,
    AlignmentType,
    TableLayoutType,
  } = docx;

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const cellBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  const metaLines = [
    { text: 'Planejamento Pedagógico', bold: true, size: 28 },
  ];
  if (meta.schoolName) metaLines.push({ text: `Escola: ${meta.schoolName}`, size: 18 });
  if (meta.userName) metaLines.push({ text: `Coordenador Pedagógico: ${meta.userName}`, size: 18 });
  metaLines.push({ text: `Gerado em: ${new Date().toLocaleString('pt-BR')}`, size: 18 });

  const legendChunks = chunkLegendCategories(
    getLegendCategories(meta.selectedCategoryIds, meta.includeSemedMarcos),
    3
  );
  const rowCount = Math.max(metaLines.length, legendChunks.length);

  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const ml = metaLines[i];
    const leftCell = new TableCell({
      children: [
        ml
          ? new Paragraph({
              children: [new TextRun({ text: ml.text, bold: !!ml.bold, size: ml.size })],
              spacing: { after: 20, line: 240 },
            })
          : new Paragraph({ text: '' }),
      ],
      width: { size: 52, type: WidthType.PERCENTAGE },
      borders: cellBorders,
      verticalAlign: 'center',
    });

    const chunk = legendChunks[i];
    const rightCell = new TableCell({
      children: [
        chunk
          ? new Paragraph({
              children: buildWordLegendRuns(chunk, TextRun),
              alignment: AlignmentType.RIGHT,
              spacing: { after: 20, line: 240 },
            })
          : new Paragraph({ text: '' }),
      ],
      width: { size: 48, type: WidthType.PERCENTAGE },
      borders: cellBorders,
      verticalAlign: 'center',
    });

    rows.push(new TableRow({ children: [leftCell, rightCell] }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows,
  });
}

export async function exportAgendaWord(events, meta) {
  const docx = await import('docx');
  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    WidthType,
    TextRun,
    HeightRule,
  } = docx;

  const eventsByDate = groupEventsByDate(events);
  const slots = buildCalendarSlots(meta.agendaView, meta.currentDate);
  const cols = meta.agendaView === 'day' ? 1 : 7;

  const metaParagraphs = [
    buildWordExportHeaderTable(meta, docx),
    new Paragraph({
      children: [
        new TextRun({
          text: formatExportPeriodTitle(meta.periodLabel, meta.agendaView),
          bold: true,
          size: meta.agendaView === 'day' ? 26 : 28,
          color: '333333',
        }),
      ],
      alignment: 'center',
      spacing: { before: 40, after: 40 },
    }),
  ];

  const tableRows = [];

  if (meta.agendaView !== 'day') {
    tableRows.push(
      new TableRow({
        height: { rule: HeightRule.AT_LEAST, value: 320 },
        children: Array.from({ length: cols }, (_, c) =>
          new (docx.TableCell)({
            children: [
              new Paragraph({
                children: [new TextRun({ text: DAY_NAMES[c], bold: true, size: 14 })],
                alignment: 'center',
              }),
            ],
            shading: { fill: 'F8F9FA' },
          })
        ),
      })
    );
  }

  if (meta.agendaView === 'day') {
    const date = slots[0];
    const dayEvents = eventsByDate.get(formatDateKey(date)) || [];
    tableRows.push(
      new TableRow({
        height: { rule: HeightRule.AUTO },
        children: [buildWordDayCell(date, dayEvents, docx, { wide: true })],
      })
    );
  } else {
    for (let r = 0; r < Math.ceil(slots.length / cols); r++) {
      const cells = [];
      for (let c = 0; c < cols; c++) {
        const date = slots[r * cols + c];
        const dayEvents = date ? eventsByDate.get(formatDateKey(date)) || [] : [];
        cells.push(buildWordDayCell(date, dayEvents, docx));
      }
      tableRows.push(
        new TableRow({
          height: { rule: HeightRule.AUTO },
          children: cells,
        })
      );
    }
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
    layout: 'autofit',
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: 'landscape' },
          },
        },
        children: [...metaParagraphs, table],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeLabel = (meta.periodLabel || 'planejamento')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .slice(0, 40);
  await saveBlob(blob, `planejamento-${safeLabel}-${new Date().toISOString().slice(0, 10)}.docx`);
}
