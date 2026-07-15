import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  MESES_PT,
  chaveCelula,
  chaveConteudo,
  dataIsoLocal,
  diasLetivosDoMes,
  fetchConteudosDiarioMes,
  fetchDiarioClasseMes,
  getDatasNaoLetivas,
  percentualFrequenciaAluno,
  salvarConteudoDiario,
  salvarDiarioClasseMes,
  sincronizarFrequenciaHistorico,
} from '../utils/diarioFrequencia';
import { getDisciplinasPorTurma } from '../utils/boletimDisciplinas';

function proximoStatus(atual) {
  if (!atual) return 'P';
  if (atual === 'P') return 'F';
  return null;
}

const DiarioFrequenciaEspecialView = ({
  turmaId,
  turmaNome,
  students = [],
  classesList = [],
  professorProfile = null,
  selectedYear,
}) => {
  const hoje = useMemo(() => new Date(), []);
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(selectedYear || hoje.getFullYear());
  const [grid, setGrid] = useState({});
  const [gridInicial, setGridInicial] = useState({});
  const [conteudos, setConteudos] = useState({});
  const [agendaNaoLetiva, setAgendaNaoLetiva] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingConteudo, setSavingConteudo] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [conteudoForm, setConteudoForm] = useState({
    data: '',
    disciplina: '',
    conteudo_aplicado: '',
    observacoes: '',
  });

  const alunosOrdenados = useMemo(
    () =>
      [...students].sort((a, b) =>
        String(a.nome || '').localeCompare(String(b.nome || ''), 'pt', { sensitivity: 'base' }),
      ),
    [students],
  );

  const diasLetivos = useMemo(
    () => diasLetivosDoMes(ano, mes, agendaNaoLetiva),
    [ano, mes, agendaNaoLetiva],
  );
  const datasNaoLetivas = useMemo(() => getDatasNaoLetivas(agendaNaoLetiva), [agendaNaoLetiva]);
  const disciplinas = useMemo(() => getDisciplinasPorTurma(turmaNome), [turmaNome]);

  const conteudosDoDia = useMemo(() => {
    if (!conteudoForm.data) return [];
    return Object.values(conteudos)
      .filter((row) => String(row.data).slice(0, 10) === conteudoForm.data)
      .sort((a, b) => String(a.disciplina).localeCompare(String(b.disciplina), 'pt-BR'));
  }, [conteudos, conteudoForm.data]);

  const turmaNomePorId = (id) =>
    (classesList || []).find((c) => String(c.id) === String(id))?.nome || '—';

  const carregarAgendaNaoLetiva = useCallback(async () => {
    setWarning(null);
    try {
      let query = supabase
        .from('agenda_eventos')
        .select('id, titulo, data_inicio, data_fim, tipo_marco, turma_id')
        .in('tipo_marco', ['feriado', 'recesso'])
        .gte('data_inicio', `${ano}-01-01`)
        .lte('data_inicio', `${ano}-12-31`);
      if (turmaId) {
        query = query.or(`turma_id.eq.${turmaId},turma_id.is.null`);
      }
      const { data, error: agendaError } = await query;
      if (agendaError) throw agendaError;
      setAgendaNaoLetiva(data || []);
      if (!data?.length) {
        setWarning('Calendário oficial não importado; feriados não serão descontados automaticamente.');
      }
    } catch (err) {
      setAgendaNaoLetiva([]);
      setWarning(
        'Não foi possível ler feriados/recessos da agenda. O diário usará apenas segunda a sexta.',
      );
      console.warn('Erro ao carregar calendário do diário:', err);
    }
  }, [ano, turmaId]);

  const carregar = useCallback(async () => {
    if (!turmaId) return;
    setLoading(true);
    setError(null);
    try {
      await carregarAgendaNaoLetiva();
      const [g, c] = await Promise.all([
        fetchDiarioClasseMes(supabase, turmaId, ano, mes),
        fetchConteudosDiarioMes(supabase, turmaId, ano, mes),
      ]);
      setGrid(g);
      setGridInicial(g);
      setConteudos(c);
      setDirty(false);
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('diario_classe_')) {
        setError(
          'Tabela do diário não encontrada. Execute supabase_diario_classe_professor.sql no Supabase.',
        );
      } else {
        setError('Erro ao carregar diário: ' + msg);
      }
      setGrid({});
      setGridInicial({});
      setConteudos({});
    } finally {
      setLoading(false);
    }
  }, [turmaId, ano, mes, carregarAgendaNaoLetiva]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (selectedYear) setAno(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    if (!diasLetivos.length) {
      setConteudoForm((prev) => ({ ...prev, data: '' }));
      return;
    }
    setConteudoForm((prev) => {
      const dataAtualValida = prev.data && diasLetivos.some((dt) => dataIsoLocal(dt) === prev.data);
      return {
        ...prev,
        data: dataAtualValida ? prev.data : dataIsoLocal(diasLetivos[0]),
        disciplina: prev.disciplina || disciplinas[0] || '',
      };
    });
  }, [diasLetivos, disciplinas]);

  useEffect(() => {
    if (!conteudoForm.data || !conteudoForm.disciplina) return;
    const row = conteudos[chaveConteudo(conteudoForm.data, conteudoForm.disciplina)];
    setConteudoForm((prev) => ({
      ...prev,
      conteudo_aplicado: row?.conteudo_aplicado || '',
      observacoes: row?.observacoes || '',
    }));
  }, [conteudoForm.data, conteudoForm.disciplina, conteudos]);

  const alterarCelula = (alunoId, dataIso) => {
    const chave = chaveCelula(alunoId, dataIso);
    setGrid((prev) => {
      const next = { ...prev };
      const novo = proximoStatus(next[chave]);
      if (novo) next[chave] = novo;
      else delete next[chave];
      return next;
    });
    setDirty(true);
  };

  const marcarTodosDia = (dataIso, status) => {
    setGrid((prev) => {
      const next = { ...prev };
      alunosOrdenados.forEach((a) => {
        const chave = chaveCelula(a.id, dataIso);
        if (status) next[chave] = status;
        else delete next[chave];
      });
      return next;
    });
    setDirty(true);
  };

  const handleSalvar = async () => {
    if (!turmaId || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      await salvarDiarioClasseMes(supabase, turmaId, professorProfile?.id, grid, gridInicial);
      await sincronizarFrequenciaHistorico(supabase, alunosOrdenados, grid, diasLetivos, mes, ano);
      setGridInicial({ ...grid });
      setDirty(false);
    } catch (err) {
      setError('Erro ao salvar: ' + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleSalvarConteudo = async (e) => {
    e.preventDefault();
    setSavingConteudo(true);
    setError(null);
    try {
      const saved = await salvarConteudoDiario(
        supabase,
        turmaId,
        professorProfile?.id,
        conteudoForm.data,
        conteudoForm.disciplina,
        {
          conteudo_aplicado: conteudoForm.conteudo_aplicado,
          observacoes: conteudoForm.observacoes,
        },
      );
      const key = chaveConteudo(conteudoForm.data, conteudoForm.disciplina);
      setConteudos((prev) => {
        const next = { ...prev };
        if (saved) next[key] = saved;
        else delete next[key];
        return next;
      });
    } catch (err) {
      setError('Erro ao salvar conteúdo: ' + (err?.message || String(err)));
    } finally {
      setSavingConteudo(false);
    }
  };

  const anosOpcoes = useMemo(() => {
    const y = hoje.getFullYear();
    return [y - 1, y, y + 1];
  }, [hoje]);

  if (alunosOrdenados.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          background: '#f9fafb',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          color: '#6b7280',
        }}
      >
        Adicione alunos à turma <strong>{turmaNome}</strong> para registrar o diário de frequência.
      </div>
    );
  }

  return (
    <div>
      <div className="diario-header">
        <div>
          <h3 style={{ margin: '0 0 4px', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-calendar-check" style={{ marginRight: 8 }} />
            Diário de classe — {turmaNome}
          </h3>
          <p style={{ margin: 0, fontSize: '0.85em', color: '#6b7280', lineHeight: 1.45 }}>
            Acompanhamento <strong>somente desta turma</strong>. As presenças/faltas marcadas aqui
            recalculam a frequência mensal oficial do aluno. Clique na célula: vazio → presente → falta → vazio.
          </p>
        </div>
        <div className="diario-controls">
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value, 10))}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}
          >
            {MESES_PT.map((nome, i) => (
              <option key={nome} value={i + 1}>
                {nome}
              </option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value, 10))}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}
          >
            {anosOpcoes.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '8px 16px' }}
            disabled={!dirty || saving}
            onClick={handleSalvar}
          >
            {saving ? 'Salvando...' : dirty ? 'Salvar diário' : 'Salvo'}
          </button>
        </div>
      </div>

      <div className="diario-legend">
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              background: '#d4edda',
              border: '1px solid #28a745',
              borderRadius: 2,
              marginRight: 4,
              verticalAlign: 'middle',
            }}
          />
          P = Presente
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              background: '#f8d7da',
              border: '1px solid #dc3545',
              borderRadius: 2,
              marginRight: 4,
              verticalAlign: 'middle',
            }}
          />
          F = Falta
        </span>
        <span style={{ color: '#6b7280' }}>Célula vazia = não registrado</span>
        <span style={{ color: '#6b7280' }}>Feriados/recessos da agenda não entram no grid</span>
      </div>

      {warning && (
        <div style={{ padding: 12, marginBottom: 12, background: '#fffbeb', color: '#92400e', borderRadius: 6 }}>
          {warning}
        </div>
      )}

      {error && (
        <div style={{ padding: 12, marginBottom: 12, background: '#fef2f2', color: '#b91c1c', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6b7280' }}>Carregando diário...</p>
      ) : (
        <>
          <form
            onSubmit={handleSalvarConteudo}
            style={{
              padding: 14,
              marginBottom: 16,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#f9fafb',
            }}
          >
            <h4 style={{ margin: '0 0 12px', color: 'var(--primary)' }}>
              Conteúdo aplicado por disciplina/dia
            </h4>
            <div className="modal-form-grid" style={{ marginBottom: 10 }}>
              <div className="input-group">
                <label>Dia letivo</label>
                <select
                  value={conteudoForm.data}
                  onChange={(e) => setConteudoForm((prev) => ({ ...prev, data: e.target.value }))}
                >
                  {diasLetivos.map((dt) => {
                    const iso = dataIsoLocal(dt);
                    return (
                      <option key={iso} value={iso}>
                        {String(dt.getDate()).padStart(2, '0')}/{String(dt.getMonth() + 1).padStart(2, '0')}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="input-group">
                <label>Disciplina</label>
                <input
                  list="diario-disciplinas"
                  value={conteudoForm.disciplina}
                  onChange={(e) => setConteudoForm((prev) => ({ ...prev, disciplina: e.target.value }))}
                  placeholder="Ex: Matemática"
                  required
                />
                <datalist id="diario-disciplinas">
                  {disciplinas.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="input-group">
              <label>Conteúdo aplicado</label>
              <textarea
                rows={3}
                value={conteudoForm.conteudo_aplicado}
                onChange={(e) =>
                  setConteudoForm((prev) => ({ ...prev, conteudo_aplicado: e.target.value }))
                }
                placeholder="Descreva o conteúdo trabalhado nesta aula"
                required
              />
            </div>
            <div className="input-group">
              <label>Observações</label>
              <textarea
                rows={2}
                value={conteudoForm.observacoes}
                onChange={(e) => setConteudoForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={savingConteudo}>
              {savingConteudo ? 'Salvando conteúdo...' : 'Salvar conteúdo'}
            </button>
            {conteudosDoDia.length > 0 && (
              <div style={{ marginTop: 12, fontSize: '0.9em', color: '#4b5563' }}>
                <strong>Conteúdos já salvos neste dia:</strong>
                <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                  {conteudosDoDia.map((row) => (
                    <li key={row.id || chaveConteudo(row.data, row.disciplina)}>
                      <button
                        type="button"
                        onClick={() =>
                          setConteudoForm({
                            data: String(row.data).slice(0, 10),
                            disciplina: row.disciplina,
                            conteudo_aplicado: row.conteudo_aplicado || '',
                            observacoes: row.observacoes || '',
                          })
                        }
                        style={{ border: 'none', background: 'transparent', color: 'var(--primary)', cursor: 'pointer' }}
                      >
                        {row.disciplina}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>

          {datasNaoLetivas.size > 0 && (
            <p style={{ color: '#6b7280', fontSize: '0.85em' }}>
              Dias não letivos removidos neste ano: {datasNaoLetivas.size}. Ex.:{' '}
              {[...datasNaoLetivas.entries()].slice(0, 4).map(([iso, events]) => `${iso} (${events[0]?.titulo || 'não letivo'})`).join(', ')}
            </p>
          )}
          <p className="table-scroll-hint">Deslize horizontalmente para marcar presença por dia.</p>
          <div className="diario-grid-wrap">
          <table style={{ minWidth: '100%' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    background: '#f3f4f6',
                    padding: '8px 10px',
                    textAlign: 'left',
                    minWidth: 160,
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Aluno
                </th>
                <th
                  style={{
                    padding: '8px 6px',
                    borderBottom: '1px solid #e5e7eb',
                    minWidth: 48,
                    textAlign: 'center',
                  }}
                >
                  %
                </th>
                {diasLetivos.map((dt) => {
                  const iso = dataIsoLocal(dt);
                  return (
                    <th
                      key={iso}
                      style={{
                        padding: '4px 2px',
                        borderBottom: '1px solid #e5e7eb',
                        textAlign: 'center',
                        minWidth: 28,
                        fontWeight: 500,
                      }}
                      title={iso}
                    >
                      {dt.getDate()}
                    </th>
                  );
                })}
              </tr>
              <tr style={{ background: '#fafafa' }}>
                <th colSpan={2} style={{ fontSize: '0.7em', padding: 4, borderBottom: '1px solid #eee' }}>
                  Atalho do dia
                </th>
                {diasLetivos.map((dt) => {
                  const iso = dataIsoLocal(dt);
                  return (
                    <th key={`a-${iso}`} style={{ padding: 2, borderBottom: '1px solid #eee' }}>
                      <div style={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <button
                          type="button"
                          title="Todos presentes"
                          onClick={() => marcarTodosDia(iso, 'P')}
                          style={{
                            fontSize: '0.65em',
                            padding: '1px 3px',
                            border: 'none',
                            background: '#d4edda',
                            cursor: 'pointer',
                            borderRadius: 2,
                          }}
                        >
                          P
                        </button>
                        <button
                          type="button"
                          title="Todos falta"
                          onClick={() => marcarTodosDia(iso, 'F')}
                          style={{
                            fontSize: '0.65em',
                            padding: '1px 3px',
                            border: 'none',
                            background: '#f8d7da',
                            cursor: 'pointer',
                            borderRadius: 2,
                          }}
                        >
                          F
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {alunosOrdenados.map((aluno) => {
                const pct = percentualFrequenciaAluno(grid, aluno.id, diasLetivos);
                return (
                  <tr key={aluno.id}>
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        background: 'white',
                        padding: '8px 10px',
                        borderBottom: '1px solid #f0f0f0',
                        fontWeight: 500,
                      }}
                    >
                      <div>{aluno.nome}</div>
                      <div style={{ fontSize: '0.85em', color: '#888', fontWeight: 400 }}>
                        {turmaNomePorId(aluno.turma_id)}
                      </div>
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: 6,
                        borderBottom: '1px solid #f0f0f0',
                        fontWeight: 600,
                        color: pct != null && pct < 85 ? '#dc3545' : '#374151',
                      }}
                    >
                      {pct != null ? `${pct}%` : '—'}
                    </td>
                    {diasLetivos.map((dt) => {
                      const iso = dataIsoLocal(dt);
                      const st = grid[chaveCelula(aluno.id, iso)];
                      const bg = st === 'P' ? '#d4edda' : st === 'F' ? '#f8d7da' : '#fff';
                      const border = st === 'P' ? '#28a745' : st === 'F' ? '#dc3545' : '#e5e7eb';
                      return (
                        <td key={iso} style={{ padding: 2, borderBottom: '1px solid #f0f0f0' }}>
                          <button
                            type="button"
                            onClick={() => alterarCelula(aluno.id, iso)}
                            style={{
                              width: '100%',
                              minWidth: 24,
                              height: 26,
                              border: `1px solid ${border}`,
                              background: bg,
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '0.7em',
                              fontWeight: 700,
                              color: st === 'P' ? '#155724' : st === 'F' ? '#721c24' : '#ccc',
                            }}
                          >
                            {st || '·'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
};

export default DiarioFrequenciaEspecialView;
