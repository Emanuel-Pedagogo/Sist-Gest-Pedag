const getSundayWeekStart = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
};

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

export function filterEventsForExport(agendaEvents, range) {
  return (agendaEvents || [])
    .filter((ev) => {
      if (!ev?.data_inicio || ev.tipo === 'aniversario') return false;
      const t = new Date(ev.data_inicio).getTime();
      return t >= range.start.getTime() && t <= range.end.getTime();
    })
    .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
}

function formatEventRow(ev) {
  const start = new Date(ev.data_inicio);
  const end = ev.data_fim ? new Date(ev.data_fim) : start;
  const data = start.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaInicio = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horaFim = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horario = horaInicio === horaFim ? horaInicio : `${horaInicio} – ${horaFim}`;
  const serie = ev.serie_id ? 'Série' : '—';
  return {
    data,
    horario,
    titulo: ev.titulo || '—',
    observacao: (ev.descricao || '').trim() || '—',
    serie,
  };
}

export async function exportAgendaPDF(events, meta) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm' });
  let y = 14;

  doc.setFontSize(16);
  doc.text('Planejamento Pedagógico', 14, y);
  y += 8;

  doc.setFontSize(10);
  if (meta.schoolName) {
    doc.text(`Escola: ${meta.schoolName}`, 14, y);
    y += 5;
  }
  if (meta.userName) {
    doc.text(`Coordenação: ${meta.userName}`, 14, y);
    y += 5;
  }
  doc.text(`Período: ${meta.periodLabel}`, 14, y);
  y += 5;
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, y);
  y += 8;

  const rows = events.map((ev) => {
    const r = formatEventRow(ev);
    return [r.data, r.horario, r.titulo, r.observacao];
  });

  autoTable(doc, {
    head: [['Data', 'Horário', 'Atividade / Evento', 'Observação']],
    body: rows,
    startY: y,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [13, 110, 253] },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 22 },
      2: { cellWidth: 50 },
      3: { cellWidth: 'auto' },
    },
  });

  const safeLabel = (meta.periodLabel || 'planejamento')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .slice(0, 40);
  doc.save(`planejamento-${safeLabel}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportAgendaWord(events, meta) {
  const docx = await import('docx');
  const { saveAs } = await import('file-saver');
  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    WidthType,
    HeadingLevel,
    TextRun,
  } = docx;

  const headerRow = new TableRow({
    children: ['Data', 'Horário', 'Atividade / Evento', 'Observação'].map(
      (text) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text, bold: true, color: 'FFFFFF' })],
            }),
          ],
          shading: { fill: '0D6EFD' },
        })
    ),
  });

  const dataRows = events.map((ev) => {
    const r = formatEventRow(ev);
    return new TableRow({
      children: [r.data, r.horario, r.titulo, r.observacao].map(
        (text) =>
          new TableCell({
            children: [new Paragraph({ text: String(text) })],
          })
      ),
    });
  });

  const metaParagraphs = [
    new Paragraph({ text: 'Planejamento Pedagógico', heading: HeadingLevel.HEADING_1 }),
  ];
  if (meta.schoolName) {
    metaParagraphs.push(new Paragraph({ text: `Escola: ${meta.schoolName}` }));
  }
  if (meta.userName) {
    metaParagraphs.push(new Paragraph({ text: `Coordenação: ${meta.userName}` }));
  }
  metaParagraphs.push(
    new Paragraph({ text: `Período: ${meta.periodLabel}` }),
    new Paragraph({ text: `Gerado em: ${new Date().toLocaleString('pt-BR')}` }),
    new Paragraph({ text: '' })
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });

  const doc = new Document({
    sections: [{ children: [...metaParagraphs, table] }],
  });

  const blob = await Packer.toBlob(doc);
  const safeLabel = (meta.periodLabel || 'planejamento')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .slice(0, 40);
  saveAs(blob, `planejamento-${safeLabel}-${new Date().toISOString().slice(0, 10)}.docx`);
}
