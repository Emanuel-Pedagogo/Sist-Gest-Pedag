/**
 * Frequência de turmas especiais — isolada do cadastro do aluno.
 * Registros ficam só em diario_frequencia_especial (participação voluntária).
 * Nunca gravar em frequencia_historico nem em alunos.frequencia.
 */

/** Dias úteis (seg–sex) de um mês. */
export function diasUteisDoMes(ano, mes) {
  const dias = [];
  const ultimo = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= ultimo; d += 1) {
    const dt = new Date(ano, mes - 1, d);
    const dow = dt.getDay();
    if (dow >= 1 && dow <= 5) dias.push(dt);
  }
  return dias;
}

export function dataIsoLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function chaveCelula(alunoId, dataIso) {
  return `${alunoId}::${dataIso}`;
}

function parseChaveCelula(chave) {
  const idx = chave.indexOf('::');
  return { alunoId: chave.slice(0, idx), data: chave.slice(idx + 2) };
}

export async function fetchDiarioMes(supabase, turmaId, ano, mes) {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('diario_frequencia_especial')
    .select('aluno_id, data, status')
    .eq('turma_id', turmaId)
    .gte('data', inicio)
    .lte('data', fim);

  if (error) throw error;

  const grid = {};
  (data || []).forEach((r) => {
    const iso = String(r.data).slice(0, 10);
    grid[chaveCelula(r.aluno_id, iso)] = r.status;
  });
  return grid;
}

/** Salva alterações: upsert P/F e remove células vazias. */
export async function salvarDiarioMes(supabase, turmaId, gridAtual, gridInicial) {
  const upserts = [];
  const deletes = [];

  const chaves = new Set([...Object.keys(gridAtual), ...Object.keys(gridInicial)]);

  chaves.forEach((chave) => {
    const atual = gridAtual[chave] ?? null;
    const inicial = gridInicial[chave] ?? null;
    if (atual === inicial) return;

    const { alunoId, data } = parseChaveCelula(chave);

    if (atual === 'P' || atual === 'F') {
      upserts.push({ turma_id: turmaId, aluno_id: alunoId, data, status: atual });
    } else if (inicial) {
      deletes.push({ turma_id: turmaId, aluno_id: alunoId, data });
    }
  });

  if (upserts.length > 0) {
    const { error } = await supabase
      .from('diario_frequencia_especial')
      .upsert(upserts, { onConflict: 'turma_id,aluno_id,data' });
    if (error) throw error;
  }

  for (const row of deletes) {
    const { error } = await supabase
      .from('diario_frequencia_especial')
      .delete()
      .eq('turma_id', row.turma_id)
      .eq('aluno_id', row.aluno_id)
      .eq('data', row.data);
    if (error) throw error;
  }
}

export function percentualFrequenciaAluno(grid, alunoId, diasUteis) {
  if (!diasUteis.length) return null;
  let marcados = 0;
  let presencas = 0;
  diasUteis.forEach((dt) => {
    const st = grid[chaveCelula(alunoId, dataIsoLocal(dt))];
    if (st === 'P' || st === 'F') {
      marcados += 1;
      if (st === 'P') presencas += 1;
    }
  });
  if (marcados === 0) return null;
  return Math.round((presencas / marcados) * 100);
}

export const MESES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
