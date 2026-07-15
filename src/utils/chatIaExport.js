import { saveBlob, savePdfDocument } from './nativeExport';

/** Extrai todas as colunas (chaves) presentes nas linhas, na ordem de 1ª aparição. */
function getColumns(rows) {
  const cols = [];
  const seen = new Set();
  rows.forEach((r) => {
    Object.keys(r || {}).forEach((k) => {
      if (!seen.has(k)) {
        seen.add(k);
        cols.push(k);
      }
    });
  });
  return cols;
}

function formatCell(v) {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const COMBINING_MARKS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');

function slug(text) {
  return String(text || 'dados')
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'dados';
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

/** Exporta um array de objetos (linhas retornadas pelo Chat IA) para PDF. */
export async function exportChatRowsToPdf(rows, title = 'Dados do Chat IA') {
  if (!rows?.length) return;
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const columns = getColumns(rows);
  const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait', unit: 'mm' });
  doc.setFontSize(14);
  doc.text(title, 14, 12);
  autoTable(doc, {
    head: [columns],
    body: rows.map((r) => columns.map((c) => formatCell(r[c]))),
    startY: 18,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [29, 78, 216] },
  });
  await savePdfDocument(doc, `chat-ia-${slug(title)}-${dateStamp()}.pdf`);
}

/** Exporta um array de objetos para um documento Word (.docx) com uma tabela. */
export async function exportChatRowsToWord(rows, title = 'Dados do Chat IA') {
  if (!rows?.length) return;
  const docx = await import('docx');
  const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } = docx;
  const columns = getColumns(rows);

  const headerRow = new TableRow({
    children: columns.map(
      (c) =>
        new TableCell({
          children: [new Paragraph({ text: c })],
          shading: { type: 'clear', color: 'auto', fill: '1D4ED8' },
        }),
    ),
  });
  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: columns.map((c) => new TableCell({ children: [new Paragraph({ text: formatCell(r[c]) })] })),
      }),
  );
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: 'Heading1', spacing: { after: 300 } }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  await saveBlob(blob, `chat-ia-${slug(title)}-${dateStamp()}.docx`);
}

/** Exporta um array de objetos para CSV (abre direto no Excel; separador ; para o padrão pt-BR). */
export async function exportChatRowsToCsv(rows, title = 'dados') {
  if (!rows?.length) return;
  const columns = getColumns(rows);
  const escapeCell = (v) => {
    const s = formatCell(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.join(';'),
    ...rows.map((r) => columns.map((c) => escapeCell(r[c])).join(';')),
  ];
  const BOM = '﻿';
  const csv = BOM + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  await saveBlob(blob, `chat-ia-${slug(title)}-${dateStamp()}.csv`);
}
