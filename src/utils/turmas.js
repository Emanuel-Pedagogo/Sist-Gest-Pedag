/** Palavras-chave em nome ou código que indicam turma especial (Libras, AEE, etc.). */
const ESPECIAL_KEYWORDS =
  /libras|língua\s*brasileira|aee|atendimento\s*educacional|refor[cç]o|complementar|sala\s*de\s*recursos|inclus[aã]o|especial/i;

/**
 * Turma especial: alunos podem ser vinculados a partir de outras turmas da escola
 * (cópia do cadastro na turma de destino).
 */
export function isTurmaEspecial(turma) {
  if (!turma) return false;
  if (turma.turma_especial === true) return true;
  const nome = String(turma.nome || '');
  const codigo = String(turma.codigo || '');
  return ESPECIAL_KEYWORDS.test(nome) || ESPECIAL_KEYWORDS.test(codigo);
}
