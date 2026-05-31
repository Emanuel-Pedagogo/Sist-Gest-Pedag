import { saveBlob, savePdfDocument } from './nativeExport';
import {
  ETIQUETA_CORES,
  ALL_ETIQUETA_IDS,
  getEventColor,
  getEventCategoryId,
} from './agendaConstants';

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

export function getEventsForExport(agendaEvents, range, selectedCategoryIds, getBirthdayEventsForDay) {
  const ids = selectedCategoryIds?.length ? selectedCategoryIds : ALL_ETIQUETA_IDS;
  const idSet = new Set(ids);

  const dbEvents = (agendaEvents || []).filter((ev) => {
    if (!ev?.data_inicio || ev.tipo === 'aniversario') return false;
    const t = new Date(ev.data_inicio).getTime();
    if (t < range.start.getTime() || t > range.end.getTime()) return false;
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

function getLegendCategories(selectedCategoryIds) {
  const ids = selectedCategoryIds?.length ? selectedCategoryIds : ALL_ETIQUETA_IDS;
  return ETIQUETA_CORES.filter((e) => ids.includes(e.id));
}

function drawPdfLegend(doc, x, y, selectedCategoryIds) {
  const categories = getLegendCategories(selectedCategoryIds);
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text('Legenda:', x, y);
  let cx = x + 18;
  for (const cat of categories) {
    const rgb = hexToRgb(cat.color);
    doc.setFillColor(...rgb);
    doc.rect(cx, y - 3, 4, 4, 'F');
    doc.setTextColor(50, 50, 50);
    doc.text(cat.label, cx + 5.5, y);
    cx += doc.getTextWidth(cat.label) + 14;
  }
}

function drawPdfEventBlock(doc, x, y, maxW, ev) {
  const color = getEventColor(ev);
  const rgb = hexToRgb(color);
  const title = (ev.titulo || '—').trim();
  const obs = (ev.descricao || '').trim();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  const titleLines = doc.splitTextToSize(title, maxW - 2);
  const titleLine = titleLines[0] || '';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  const obsLines = obs ? doc.splitTextToSize(obs, maxW - 2) : [];
  const obsShown = obsLines.slice(0, 2);

  const blockH = 3.5 + (obsShown.length ? obsShown.length * 2.8 + 1 : 0);

  doc.setFillColor(...rgb);
  doc.roundedRect(x, y, maxW - 0.5, blockH, 0.4, 0.4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.text(titleLine, x + 1, y + 2.8);

  if (obsShown.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(3.8);
    doc.text(obsShown, x + 1, y + 5.5);
  }

  return blockH + 0.6;
}

function drawPdfCalendarGrid(doc, meta, eventsByDate, startY) {
  const { agendaView, currentDate } = meta;
  const slots = buildCalendarSlots(agendaView, currentDate);
  const cols = agendaView === 'day' ? 1 : 7;
  const rows = Math.ceil(slots.length / cols);

  const margin = 8;
  const pageW = 297;
  const gridTop = startY;
  const gridBottom = 200;
  const gridH = gridBottom - gridTop;
  const gridW = pageW - margin * 2;
  const cellW = gridW / cols;
  const cellH = gridH / rows;
  const headerH = agendaView === 'day' ? 0 : 6;

  if (agendaView !== 'day') {
    doc.setFillColor(248, 249, 250);
    doc.rect(margin, gridTop, gridW, headerH, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'bold');
    for (let c = 0; c < cols; c++) {
      const hx = margin + c * cellW;
      doc.rect(hx, gridTop, cellW, headerH);
      doc.text(DAY_NAMES[c], hx + cellW / 2, gridTop + 4, { align: 'center' });
    }
  }

  const bodyTop = gridTop + headerH;

  for (let i = 0; i < slots.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = margin + col * cellW;
    const y = bodyTop + row * cellH;

    doc.setDrawColor(220, 220, 220);
    doc.rect(x, y, cellW, cellH);

    const date = slots[i];
    if (!date) continue;

    const dayNum = date.getDate();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);
    doc.text(String(dayNum), x + 2, y + 4);

    if (agendaView === 'week') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(130, 130, 130);
      doc.text(DAY_NAMES_SHORT[date.getDay()], x + 2 + doc.getTextWidth(String(dayNum)) + 2, y + 4);
    }

    const dayEvents = eventsByDate.get(formatDateKey(date)) || [];
    let ey = y + 7;
    const maxEventW = cellW - 2;
    const maxY = y + cellH - 1;

    for (const ev of dayEvents) {
      if (ey >= maxY - 3) break;
      const blockH = drawPdfEventBlock(doc, x + 1, ey, maxEventW, ev);
      ey += blockH;
    }
  }
}

export async function exportAgendaPDF(events, meta) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const margin = 8;
  let y = 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text('Planejamento Pedagógico', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  if (meta.schoolName) {
    doc.text(`Escola: ${meta.schoolName}`, margin, y);
    y += 4;
  }
  if (meta.userName) {
    doc.text(`Coordenador Pedagógico: ${meta.userName}`, margin, y);
    y += 4;
  }
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y);
  y += 5;

  drawPdfLegend(doc, margin, y, meta.selectedCategoryIds);
  y += 11;

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
  const { Paragraph, TextRun } = docx;
  const color = getEventColor(ev);
  const fill = hexToDocxFill(color);
  const title = (ev.titulo || '—').trim();
  const obs = (ev.descricao || '').trim();

  const children = [new TextRun({ text: title, bold: true, color: 'FFFFFF', size: 16 })];
  if (obs) {
    children.push(new TextRun({ text: '\n' + obs, color: 'FFFFFF', size: 14 }));
  }

  return new Paragraph({
    children,
    shading: { fill },
    spacing: { after: 40 },
  });
}

function buildWordDayCell(date, dayEvents, docx, { wide = false } = {}) {
  const { Paragraph, TableCell, TextRun, WidthType } = docx;
  const children = [];

  if (date) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${date.getDate()}${wide ? ` — ${DAY_NAMES[date.getDay()]}` : ''}`,
            bold: true,
            size: 18,
          }),
        ],
        spacing: { after: 60 },
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

export async function exportAgendaWord(events, meta) {
  const docx = await import('docx');
  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    WidthType,
    HeadingLevel,
    TextRun,
  } = docx;

  const eventsByDate = groupEventsByDate(events);
  const slots = buildCalendarSlots(meta.agendaView, meta.currentDate);
  const cols = meta.agendaView === 'day' ? 1 : 7;

  const legendCategories = getLegendCategories(meta.selectedCategoryIds);
  const legendParagraph = new Paragraph({
    children: [
      new TextRun({ text: 'Legenda: ', bold: true, size: 18 }),
      ...legendCategories.flatMap((cat, i) => [
        ...(i > 0 ? [new TextRun({ text: '   ', size: 18 })] : []),
        new TextRun({ text: '■ ', color: hexToDocxFill(cat.color), size: 18 }),
        new TextRun({ text: cat.label, size: 18 }),
      ]),
    ],
    spacing: { after: 200 },
  });

  const metaParagraphs = [
    new Paragraph({ text: 'Planejamento Pedagógico', heading: HeadingLevel.HEADING_1 }),
  ];
  if (meta.schoolName) {
    metaParagraphs.push(new Paragraph({ text: `Escola: ${meta.schoolName}` }));
  }
  if (meta.userName) {
    metaParagraphs.push(new Paragraph({ text: `Coordenador Pedagógico: ${meta.userName}` }));
  }
  metaParagraphs.push(
    new Paragraph({ text: `Gerado em: ${new Date().toLocaleString('pt-BR')}` }),
    new Paragraph({ text: '' }),
    legendParagraph,
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
      spacing: { before: 80, after: 40 },
    })
  );

  const tableRows = [];

  if (meta.agendaView !== 'day') {
    tableRows.push(
      new TableRow({
        children: Array.from({ length: cols }, (_, c) =>
          new (docx.TableCell)({
            children: [
              new Paragraph({
                children: [new TextRun({ text: DAY_NAMES[c], bold: true, size: 16 })],
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
      tableRows.push(new TableRow({ children: cells }));
    }
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
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
