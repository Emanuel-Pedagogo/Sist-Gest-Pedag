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

function parseDateOnly(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
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

export function chaveConteudo(dataIso, disciplina) {
  return `${dataIso}::${String(disciplina || '').trim().toUpperCase()}`;
}

function parseChaveCelula(chave) {
  const idx = chave.indexOf('::');
  return { alunoId: chave.slice(0, idx), data: chave.slice(idx + 2) };
}

function isNaoLetivoEvent(ev) {
  const tipo = String(ev?.tipo_marco || '').toLowerCase();
  return tipo === 'feriado' || tipo === 'recesso';
}

export function getEventosNaoLetivos(agendaEvents = []) {
  return (agendaEvents || []).filter(isNaoLetivoEvent);
}

export function getDatasNaoLetivas(agendaEvents = []) {
  const datas = new Map();
  getEventosNaoLetivos(agendaEvents).forEach((ev) => {
    const inicio = parseDateOnly(ev.data_inicio);
    const fim = parseDateOnly(ev.data_fim) || inicio;
    if (!inicio || !fim) return;
    const cursor = new Date(inicio);
    while (cursor <= fim) {
      const iso = dataIsoLocal(cursor);
      if (!datas.has(iso)) datas.set(iso, []);
      datas.get(iso).push(ev);
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return datas;
}

/** Dias letivos: segunda a sexta, removendo feriados/recessos da agenda. */
export function diasLetivosDoMes(ano, mes, agendaEvents = []) {
  const naoLetivos = getDatasNaoLetivas(agendaEvents);
  return diasUteisDoMes(ano, mes).filter((dt) => !naoLetivos.has(dataIsoLocal(dt)));
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

export async function fetchDiarioClasseMes(supabase, turmaId, ano, mes) {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('diario_classe_frequencia')
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

/** Salva alterações no diário de classe regular/professor. */
export async function salvarDiarioClasseMes(supabase, turmaId, professorId, gridAtual, gridInicial) {
  const upserts = [];
  const deletes = [];

  const chaves = new Set([...Object.keys(gridAtual), ...Object.keys(gridInicial)]);

  chaves.forEach((chave) => {
    const atual = gridAtual[chave] ?? null;
    const inicial = gridInicial[chave] ?? null;
    if (atual === inicial) return;

    const { alunoId, data } = parseChaveCelula(chave);

    if (atual === 'P' || atual === 'F') {
      upserts.push({
        turma_id: turmaId,
        aluno_id: alunoId,
        data,
        status: atual,
        professor_id: professorId || null,
        updated_at: new Date().toISOString(),
      });
    } else if (inicial) {
      deletes.push({ turma_id: turmaId, aluno_id: alunoId, data });
    }
  });

  if (upserts.length > 0) {
    const { error } = await supabase
      .from('diario_classe_frequencia')
      .upsert(upserts, { onConflict: 'turma_id,aluno_id,data' });
    if (error) throw error;
  }

  for (const row of deletes) {
    const { error } = await supabase
      .from('diario_classe_frequencia')
      .delete()
      .eq('turma_id', row.turma_id)
      .eq('aluno_id', row.aluno_id)
      .eq('data', row.data);
    if (error) throw error;
  }
}

export async function fetchConteudosDiarioMes(supabase, turmaId, ano, mes) {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('diario_classe_conteudos')
    .select('*')
    .eq('turma_id', turmaId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: true })
    .order('disciplina', { ascending: true });

  if (error) throw error;

  const map = {};
  (data || []).forEach((row) => {
    map[chaveConteudo(String(row.data).slice(0, 10), row.disciplina)] = row;
  });
  return map;
}

export async function salvarConteudoDiario(
  supabase,
  turmaId,
  professorId,
  data,
  disciplina,
  payload,
) {
  const disciplinaLimpa = String(disciplina || '').trim();
  const conteudo = String(payload?.conteudo_aplicado || '').trim();
  const observacoes = String(payload?.observacoes || '').trim();
  if (!turmaId || !data || !disciplinaLimpa) {
    throw new Error('Informe data e disciplina para salvar o conteúdo.');
  }

  if (!conteudo && !observacoes) {
    const { error } = await supabase
      .from('diario_classe_conteudos')
      .delete()
      .eq('turma_id', turmaId)
      .eq('data', data)
      .eq('disciplina', disciplinaLimpa);
    if (error) throw error;
    return null;
  }

  const row = {
    turma_id: turmaId,
    professor_id: professorId || null,
    data,
    disciplina: disciplinaLimpa,
    conteudo_aplicado: conteudo,
    observacoes: observacoes || null,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = await supabase
    .from('diario_classe_conteudos')
    .upsert([row], { onConflict: 'turma_id,data,disciplina' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return saved;
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

export async function sincronizarFrequenciaHistorico(
  supabase,
  alunos,
  grid,
  diasLetivos,
  mes,
  ano,
) {
  const mesReferencia = MESES_PT[mes - 1];
  const rows = [];
  (alunos || []).forEach((aluno) => {
    const pct = percentualFrequenciaAluno(grid, aluno.id, diasLetivos);
    if (pct == null) return;
    rows.push({
      aluno_id: aluno.id,
      mes_referencia: mesReferencia,
      ano,
      porcentagem: pct,
    });
  });

  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from('frequencia_historico')
    .upsert(rows, { onConflict: 'aluno_id,mes_referencia,ano' })
    .select('*');
  if (error) throw error;
  return data || rows;
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
