/**
 * Converte data DD/MM/AAAA para AAAA-MM-DD (campo date do formulário / Supabase).
 */
export function dataBrParaIso(dataBr) {
  if (!dataBr || typeof dataBr !== 'string') return '';
  const m = dataBr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function pushRow(resultado, coletor, nomeRaw, dataNascBr, restoRaw) {
  const nomeTrim = nomeRaw.replace(/\s+/g, ' ').trim();
  if (!nomeTrim || nomeTrim.length < 3) return;

  let responsavel = (restoRaw || '').replace(/\s+/g, ' ').trim();
  responsavel = responsavel.replace(/\s*--\s*\d+\s+of\s+\d+.*$/i, '').trim();
  responsavel = responsavel.replace(/\s*Pág\.?\s*\d+.*$/i, '').trim();
  responsavel = responsavel.replace(/\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}.*$/i, '').trim();
  if (/^nenhum\s+responsável/i.test(responsavel)) responsavel = '';

  const dataIso = dataBrParaIso(dataNascBr);
  if (!dataIso) return;

  resultado.push({
    matriculaColetor: String(coletor).trim(),
    nome: nomeTrim,
    data_nascimento: dataIso,
    nome_responsavel: responsavel || null,
  });
}

/** Tenta ler uma linha por linha (PDF com quebras de linha). */
function parsePorLinhas(textoCompleto) {
  const linhas = textoCompleto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let i = 0;
  for (; i < linhas.length; i++) {
    const l = linhas[i];
    if (/Mat\.?\s*Coletor/i.test(l) && /Nome/i.test(l) && /Nascimento/i.test(l)) {
      i += 1;
      break;
    }
    if (/Mat\.?\s*Coletor/i.test(l) && /Nome/i.test(l)) {
      i += 1;
      break;
    }
  }

  const resultado = [];
  const linhaAlunoRe =
    /^(\d+)\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(.+)$/u;

  for (; i < linhas.length; i++) {
    let linha = linhas[i];
    if (/^LISTA DE ALUNOS/i.test(linha)) continue;
    if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(linha)) break;
    if (/Pág\.?\s*\d+/i.test(linha)) break;
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(linha)) break;

    let match = linha.match(linhaAlunoRe);
    if (!match && i + 1 < linhas.length) {
      const merged = `${linha} ${linhas[i + 1]}`;
      match = merged.match(linhaAlunoRe);
      if (match) i += 1;
    }
    if (!match) continue;

    const [, coletor, nome, dataNascBr, resto] = match;
    pushRow(resultado, coletor, nome, dataNascBr, resto);
  }

  return resultado;
}

/**
 * Fallback: texto colado em blocos (pdf.js às vezes junta itens com espaço, sem \n entre alunos).
 * Número do coletor: tipicamente 1–4 dígitos (evita casar INEP 15013413).
 */
function parsePorBloco(textoCompleto) {
  const resultado = [];
  const headerIdx = textoCompleto.search(/Mat\.?\s*Coletor/i);
  const slice = headerIdx >= 0 ? textoCompleto.slice(headerIdx) : textoCompleto;

  const re = /\b(\d{1,3})\s+([\p{L}][\p{L}\s.'’-]{1,180}?)\s+(\d{2}\/\d{2}\/\d{4})\s+/gu;
  const matches = [...slice.matchAll(re)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const coletor = m[1];
    const nome = m[2];
    const dataBr = m[3];
    const fim = m.index + m[0].length;
    const prox = i + 1 < matches.length ? matches[i + 1].index : slice.length;
    const resto = slice.slice(fim, prox).trim();
    pushRow(resultado, coletor, nome, dataBr, resto);
  }

  return resultado;
}

/**
 * Extrai linhas de aluno do texto do PDF "Lista de Alunos" (SEMED / EducaMais).
 */
export function parseLinhasListaAlunos(textoCompleto) {
  if (!textoCompleto || typeof textoCompleto !== 'string') return [];

  const porLinhas = parsePorLinhas(textoCompleto);
  if (porLinhas.length > 0) return porLinhas;

  return parsePorBloco(textoCompleto);
}
