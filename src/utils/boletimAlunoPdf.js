import { savePdfDocument } from './nativeExport';
import { formatNivel } from './sondagemNiveis';

const BIMESTRES = [1, 2, 3, 4];
const FALTAS_BIMESTRE_KEY = 'Faltas do Bimestre';

function dataHojeBr() {
  return new Date().toLocaleDateString('pt-BR');
}

function slug(texto) {
  return String(texto || 'aluno')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function formatDataBr(iso) {
  if (!iso) return '-';
  const ymd = String(iso).split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  }
  return String(iso);
}

/**
 * Boletim individual do aluno em PDF, no formato que o professor manda para
 * o responsável (WhatsApp/impressão).
 *
 * @param {object} aluno            { nome, matricula, data_nascimento }
 * @param {object} dados            { notas, ocorrencias, sondagem }
 *   - notas: linhas de notas_boletim (disciplina, bimestre, nota, falta)
 *   - ocorrencias: linhas de ocorrencias (titulo, tipo, data_ocorrencia, descricao)
 *   - sondagem: última sondagem { nivel_leitura, nivel_escrita, data } ou null
 * @param {object} meta             { escolaNome, turmaNome, anoLetivo, professorNome, observacao }
 */
export async function exportBoletimAlunoPdf(aluno, dados, meta) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margem = 14;
  const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
  let y = 16;

  // ---------- Cabeçalho ----------
  doc.setFontSize(15);
  doc.setFont(undefined, 'bold');
  doc.text('Boletim do Aluno', margem, y);
  doc.setFont(undefined, 'normal');

  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(90);
  if (meta?.escolaNome) {
    doc.text(meta.escolaNome, margem, y);
    y += 5;
  }
  doc.text(`Emitido em ${dataHojeBr()}`, margem, y);
  doc.setTextColor(0);

  y += 8;
  doc.setDrawColor(210);
  doc.line(margem, y, margem + larguraUtil, y);
  y += 8;

  // ---------- Identificação ----------
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(aluno?.nome || 'Aluno', margem, y);
  doc.setFont(undefined, 'normal');
  y += 6;

  doc.setFontSize(10);
  const identificacao = [
    meta?.turmaNome ? `Turma: ${meta.turmaNome}` : null,
    meta?.anoLetivo ? `Ano letivo: ${meta.anoLetivo}` : null,
    aluno?.matricula ? `Matrícula: ${aluno.matricula}` : null,
  ].filter(Boolean);
  if (identificacao.length) {
    doc.text(identificacao.join('   ·   '), margem, y);
    y += 8;
  }

  // ---------- Notas por disciplina ----------
  const notas = dados?.notas || [];
  const porDisciplina = {};
  let totalFaltas = 0;

  notas.forEach((row) => {
    // Faltas são somadas de qualquer linha: o boletim da tela grava só nas
    // linhas "Faltas do Bimestre", mas a importação de PDF pode trazê-las
    // por disciplina. Mesma regra do relatório de alunos em App.jsx.
    const f = row.falta != null && row.falta !== '' ? Number(row.falta) : 0;
    if (!Number.isNaN(f)) totalFaltas += f;

    if (row.disciplina === FALTAS_BIMESTRE_KEY) return;
    if (!porDisciplina[row.disciplina]) porDisciplina[row.disciplina] = {};
    porDisciplina[row.disciplina][row.bimestre] = row.nota;
  });

  const disciplinas = Object.keys(porDisciplina).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Notas por bimestre', margem, y);
  doc.setFont(undefined, 'normal');
  y += 3;

  if (disciplinas.length === 0) {
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('Nenhuma nota lançada até o momento.', margem, y);
    doc.setTextColor(0);
    y += 8;
  } else {
    const corpo = disciplinas.map((disc) => {
      const celulas = BIMESTRES.map((b) => {
        const n = porDisciplina[disc][b];
        return n != null && n !== '' ? String(n) : '-';
      });
      const numeros = BIMESTRES.map((b) => porDisciplina[disc][b])
        .filter((n) => n != null && n !== '' && !Number.isNaN(Number(n)))
        .map(Number);
      const media = numeros.length ? (numeros.reduce((s, n) => s + n, 0) / numeros.length).toFixed(1) : '-';
      return [disc, ...celulas, media];
    });

    autoTable(doc, {
      head: [['Disciplina', '1º bim', '2º bim', '3º bim', '4º bim', 'Média']],
      body: corpo,
      startY: y + 2,
      margin: { left: margem, right: margem },
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [44, 62, 80], halign: 'center' },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold' },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ---------- Frequência ----------
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Frequência', margem, y);
  doc.setFont(undefined, 'normal');
  y += 6;
  doc.setFontSize(10);
  doc.text(`Total de faltas registradas: ${totalFaltas}`, margem, y);
  y += 10;

  // ---------- Leitura e escrita ----------
  const sondagem = dados?.sondagem;
  if (sondagem) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Leitura e escrita', margem, y);
    doc.setFont(undefined, 'normal');
    y += 6;
    doc.setFontSize(10);
    doc.text(`Leitura: ${formatNivel(sondagem.nivel_leitura) || 'Não informado'}`, margem, y);
    y += 5;
    doc.text(`Escrita: ${formatNivel(sondagem.nivel_escrita) || 'Não informado'}`, margem, y);
    y += 5;
    doc.setTextColor(120);
    doc.setFontSize(9);
    doc.text(`Avaliação de ${formatDataBr(sondagem.data)}`, margem, y);
    doc.setTextColor(0);
    y += 10;
  }

  // ---------- Ocorrências ----------
  const ocorrencias = dados?.ocorrencias || [];
  if (ocorrencias.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 16;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Registros de acompanhamento', margem, y);
    doc.setFont(undefined, 'normal');

    autoTable(doc, {
      head: [['Data', 'Tipo', 'Registro']],
      body: ocorrencias.map((o) => [
        formatDataBr(o.data_ocorrencia),
        o.tipo || '-',
        [o.titulo, o.descricao].filter(Boolean).join(' — ') || '-',
      ]),
      startY: y + 3,
      margin: { left: margem, right: margem },
      styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [44, 62, 80] },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 30 } },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ---------- Observação do professor ----------
  const observacao = String(meta?.observacao || '').trim();
  if (observacao) {
    if (y > 230) {
      doc.addPage();
      y = 16;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Observação do professor', margem, y);
    doc.setFont(undefined, 'normal');
    y += 6;
    doc.setFontSize(10);
    const linhas = doc.splitTextToSize(observacao, larguraUtil);
    doc.text(linhas, margem, y);
    y += linhas.length * 5 + 8;
  }

  // ---------- Assinatura ----------
  if (y > 250) {
    doc.addPage();
    y = 30;
  }
  y = Math.max(y, 245);
  doc.setDrawColor(150);
  doc.line(margem, y, margem + 70, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(meta?.professorNome || 'Professor(a)', margem, y);
  doc.setTextColor(0);

  const nomeArquivo = `boletim-${slug(aluno?.nome)}-${new Date().toISOString().slice(0, 10)}.pdf`;
  await savePdfDocument(doc, nomeArquivo);
}
