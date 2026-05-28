import { isTurmaEspecial } from './turmas';

/** Alunos vinculados a uma turma especial (cadastro único em `alunos`). */
export async function fetchAlunosTurmaEspecial(supabase, turmaId) {
  const { data: vinculos, error: vErr } = await supabase
    .from('alunos_turmas_especiais')
    .select('aluno_id')
    .eq('turma_id', turmaId);

  if (vErr) throw vErr;
  const ids = (vinculos || []).map((v) => v.aluno_id).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: alunos, error: aErr } = await supabase.from('alunos').select('*').in('id', ids);
  if (aErr) throw aErr;
  return alunos || [];
}

/** Alunos da turma: regular (`turma_id`) ou especial (vínculo). */
export async function fetchAlunosDaTurma(supabase, turmaId, turma = null) {
  if (isTurmaEspecial(turma)) {
    return fetchAlunosTurmaEspecial(supabase, turmaId);
  }
  const { data, error } = await supabase.from('alunos').select('*').eq('turma_id', turmaId);
  if (error) throw error;
  return data || [];
}

export async function fetchAlunoIdsTurmaEspecial(supabase, turmaId) {
  const { data, error } = await supabase
    .from('alunos_turmas_especiais')
    .select('aluno_id')
    .eq('turma_id', turmaId);
  if (error) throw error;
  return new Set((data || []).map((r) => String(r.aluno_id)));
}

export async function vincularAlunoTurmaEspecial(supabase, alunoId, turmaId) {
  const { error } = await supabase
    .from('alunos_turmas_especiais')
    .insert([{ aluno_id: alunoId, turma_id: turmaId }]);
  if (error) throw error;
}

export async function desvincularAlunoTurmaEspecial(supabase, alunoId, turmaId) {
  const { error } = await supabase
    .from('alunos_turmas_especiais')
    .delete()
    .eq('aluno_id', alunoId)
    .eq('turma_id', turmaId);
  if (error) throw error;
}

export function contarEtiquetasAlunos(alunos) {
  return {
    verde: alunos?.filter((a) => a.etiqueta_cor === 'verde').length || 0,
    amarelo: alunos?.filter((a) => a.etiqueta_cor === 'amarelo').length || 0,
    vermelho: alunos?.filter((a) => a.etiqueta_cor === 'vermelho').length || 0,
    azul: alunos?.filter((a) => a.etiqueta_cor === 'azul').length || 0,
  };
}
