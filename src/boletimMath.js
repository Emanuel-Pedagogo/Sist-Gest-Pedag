export function toNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Média final numérica:
 * - B1 e B3 peso 2, B2 e B4 peso 3
 * - RS1 (se preenchida) substitui a menor nota do 1º semestre (B1/B2) e entra com o peso da nota substituída
 * - RS2 idem no 2º semestre (B3/B4)
 *
 * Retorna `null` se não for possível calcular (faltando nota, valores inválidos, etc).
 */
export function computeMF({ b1, b2, b3, b4, rs1, rs2 }) {
  const nb1 = toNum(b1);
  const nb2 = toNum(b2);
  const nb3 = toNum(b3);
  const nb4 = toNum(b4);
  if (nb1 == null || nb2 == null || nb3 == null || nb4 == null) return null;

  const nrs1 = toNum(rs1);
  const nrs2 = toNum(rs2);

  let contribSem1;
  if (nrs1 != null) {
    const rsSubB1 = nb1 <= nb2;
    const pesoSubstituido = rsSubB1 ? 2 : 3;
    const outraNota = rsSubB1 ? nb2 : nb1;
    const pesoOutra = rsSubB1 ? 3 : 2;
    contribSem1 = outraNota * pesoOutra + nrs1 * pesoSubstituido;
  } else {
    contribSem1 = nb1 * 2 + nb2 * 3;
  }

  let contribSem2;
  if (nrs2 != null) {
    const rsSubB3 = nb3 <= nb4;
    const pesoSubstituido = rsSubB3 ? 2 : 3;
    const outraNota = rsSubB3 ? nb4 : nb3;
    const pesoOutra = rsSubB3 ? 3 : 2;
    contribSem2 = outraNota * pesoOutra + nrs2 * pesoSubstituido;
  } else {
    contribSem2 = nb3 * 2 + nb4 * 3;
  }

  const mf = (contribSem1 + contribSem2) / 10;
  return Number.isFinite(mf) ? mf : null;
}

/**
 * Retorna:
 * - `true` se todas as médias forem >= 5
 * - `false` se alguma média for < 5
 * - `null` se não houver nenhuma média calculável (tudo inválido/incompleto)
 */
export function isAprovado(mfs) {
  if (!Array.isArray(mfs)) return null;
  const valid = mfs.map((v) => toNum(v)).filter((v) => v != null);
  if (valid.length === 0) return null;
  return valid.every((v) => v >= 5);
}

