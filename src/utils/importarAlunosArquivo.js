import { dataBrParaIso } from '../listaAlunosPdf';

/** Extensões aceitas na importação de alunos. */
export const EXTENSOES_ACEITAS = '.pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.webp';

/** @returns {'pdf'|'imagem'|'planilha'|null} */
export function detectarTipo(file) {
  const nome = String(file?.name || '').toLowerCase();
  const tipo = String(file?.type || '').toLowerCase();

  if (tipo === 'application/pdf' || nome.endsWith('.pdf')) return 'pdf';
  if (tipo.startsWith('image/')) return 'imagem';
  if (/\.(jpe?g|png|webp|heic|heif)$/.test(nome)) return 'imagem';
  if (/\.(csv|xlsx|xls|xlsm)$/.test(nome)) return 'planilha';
  if (tipo.includes('spreadsheet') || tipo.includes('excel') || tipo === 'text/csv') return 'planilha';
  return null;
}

/**
 * Converte data em vários formatos para AAAA-MM-DD.
 * Aceita: Date, número de série do Excel, AAAA-MM-DD, DD/MM/AAAA, DD-MM-AA etc.
 * @returns {string} ISO ou '' quando não reconhecer.
 */
export function normalizarData(valor) {
  if (valor == null || valor === '') return '';

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return toIso(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
  }

  // Número de série do Excel (dias desde 30/12/1899)
  if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0 && valor < 100000) {
    const base = Date.UTC(1899, 11, 30);
    const d = new Date(base + valor * 86400000);
    return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  const texto = String(valor).trim();
  if (!texto) return '';

  // Já em ISO
  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // Formato estrito DD/MM/AAAA — reaproveita o leitor do PDF
  const viaPdf = dataBrParaIso(texto);
  if (viaPdf) return viaPdf;

  // DD/MM/AA, D-M-AAAA, DD.MM.AAAA ...
  const br = texto.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})/);
  if (br) {
    const dia = Number(br[1]);
    const mes = Number(br[2]);
    let ano = Number(br[3]);
    if (br[3].length === 2) ano = ano <= 25 ? 2000 + ano : 1900 + ano;
    return toIso(ano, mes, dia);
  }

  return '';
}

function toIso(ano, mes, dia) {
  if (!ano || !mes || !dia) return '';
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return '';
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Lê CSV/Excel como matriz de linhas. SheetJS é carregado sob demanda para não
 * pesar no carregamento inicial do app (mesmo padrão de jspdf/docx).
 * @returns {Promise<string[][]>}
 */
export async function lerPlanilha(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });

  const primeiraAba = wb.SheetNames[0];
  if (!primeiraAba) return [];

  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[primeiraAba], {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });

  // Remove linhas totalmente vazias
  return linhas.filter((linha) =>
    Array.isArray(linha) && linha.some((c) => String(c ?? '').trim() !== ''),
  );
}

/**
 * Aplica o mapeamento de colunas devolvido pela IA em todas as linhas da planilha.
 * @param {string[][]} linhas
 * @param {{nome:number|null, data_nascimento:number|null, matricula:number|null, responsavel:number|null, contato:number|null}} colunas
 * @param {boolean} temCabecalho
 */
export function aplicarMapeamento(linhas, colunas, temCabecalho = true) {
  const corpo = temCabecalho ? linhas.slice(1) : linhas;
  const pegar = (linha, indice) => {
    if (indice == null || indice < 0) return null;
    const v = String(linha[indice] ?? '').trim();
    return v === '' ? null : v;
  };

  return corpo
    .map((linha) => ({
      nome: pegar(linha, colunas?.nome),
      data_nascimento: normalizarData(
        colunas?.data_nascimento != null ? linha[colunas.data_nascimento] : '',
      ) || null,
      matricula: pegar(linha, colunas?.matricula),
      responsavel: pegar(linha, colunas?.responsavel),
      contato: pegar(linha, colunas?.contato),
      revisar: false,
    }))
    .filter((r) => r.nome && r.nome.length >= 3);
}

/**
 * Reduz a imagem antes de enviar à IA. Foto de celular passa de 5 MB e estoura o
 * limite da Edge Function; reduzida para 2000px o texto continua legível.
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
export async function comprimirImagem(file, maxLado = 2000) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
}

/** Junta resultados de vários arquivos, removendo repetidos pelo nome. */
export function juntarSemRepetir(listas) {
  const vistos = new Set();
  const saida = [];
  for (const lista of listas) {
    for (const row of lista || []) {
      const chave = String(row?.nome || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!chave || vistos.has(chave)) continue;
      vistos.add(chave);
      saida.push(row);
    }
  }
  return saida;
}
