import { getMotivoOrigemEtiqueta } from './studentColorEvaluator';

function turmaInfoAluno(aluno, classesList) {
  const turma = (classesList || []).find((c) => String(c.id) === String(aluno.turma_id));
  return {
    turmaNome: turma?.nome || '',
    anoEscolar: turma?.ano_escolar ?? turma?.ano ?? null,
  };
}

/**
 * Calcula motivo automático da etiqueta (Notas / Sondagem / Ocorrência) para a lista de alunos.
 */
export async function enrichAlunosEtiquetaMotivo(supabase, alunos, { schoolId, classesList = [] }) {
  if (!alunos?.length || !schoolId) return alunos || [];

  const { data: escola, error: escErr } = await supabase
    .from('escolas')
    .select('configuracoes')
    .eq('id', schoolId)
    .single();

  if (escErr || !escola?.configuracoes?.tags) return alunos;

  const tagConfig = escola.configuracoes.tags;
  const ids = alunos.map((a) => a.id).filter(Boolean);
  if (ids.length === 0) return alunos;

  const [{ data: notas }, { data: sondagens }, { data: ocorrencias }] = await Promise.all([
    supabase.from('notas_boletim').select('aluno_id, nota').in('aluno_id', ids),
    supabase
      .from('sondagens')
      .select('aluno_id, nivel_leitura, nivel_escrita, data')
      .in('aluno_id', ids)
      .order('data', { ascending: false }),
    supabase.from('ocorrencias').select('aluno_id, tipo').in('aluno_id', ids),
  ]);

  const dataByAluno = {};
  ids.forEach((id) => {
    dataByAluno[id] = { notas: [], sondagem: null, ocorrencias: [] };
  });

  (notas || []).forEach((n) => {
    if (n.nota != null && n.nota !== '' && dataByAluno[n.aluno_id]) {
      dataByAluno[n.aluno_id].notas.push(parseFloat(n.nota));
    }
  });

  (sondagens || []).forEach((s) => {
    if (!dataByAluno[s.aluno_id]?.sondagem) {
      dataByAluno[s.aluno_id].sondagem = s;
    }
  });

  (ocorrencias || []).forEach((o) => {
    if (dataByAluno[o.aluno_id]) {
      dataByAluno[o.aluno_id].ocorrencias.push(o.tipo);
    }
  });

  return alunos.map((aluno) => {
    const data = dataByAluno[aluno.id] || { notas: [], sondagem: null, ocorrencias: [] };
    const { turmaNome, anoEscolar } = turmaInfoAluno(aluno, classesList);
    const motivoOrigem = getMotivoOrigemEtiqueta(tagConfig, data, aluno.etiqueta_cor, {
      turmaNome,
      anoEscolar,
    });
    return { ...aluno, etiqueta_motivo_origem: motivoOrigem };
  });
}
