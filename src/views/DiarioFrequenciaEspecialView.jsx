import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  MESES_PT,
  chaveCelula,
  dataIsoLocal,
  diasUteisDoMes,
  fetchDiarioMes,
  percentualFrequenciaAluno,
  salvarDiarioMes,
} from '../utils/diarioFrequencia';

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
}) => {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [grid, setGrid] = useState({});
  const [gridInicial, setGridInicial] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);

  const alunosOrdenados = useMemo(
    () =>
      [...students].sort((a, b) =>
        String(a.nome || '').localeCompare(String(b.nome || ''), 'pt', { sensitivity: 'base' }),
      ),
    [students],
  );

  const diasUteis = useMemo(() => diasUteisDoMes(ano, mes), [ano, mes]);

  const turmaNomePorId = (id) =>
    (classesList || []).find((c) => String(c.id) === String(id))?.nome || '—';

  const carregar = useCallback(async () => {
    if (!turmaId) return;
    setLoading(true);
    setError(null);
    try {
      const g = await fetchDiarioMes(supabase, turmaId, ano, mes);
      setGrid(g);
      setGridInicial(g);
      setDirty(false);
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('diario_frequencia_especial')) {
        setError(
          'Tabela do diário não encontrada. Execute supabase_diario_frequencia_especial.sql no Supabase.',
        );
      } else {
        setError('Erro ao carregar diário: ' + msg);
      }
      setGrid({});
      setGridInicial({});
    } finally {
      setLoading(false);
    }
  }, [turmaId, ano, mes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

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
      await salvarDiarioMes(supabase, turmaId, grid, gridInicial);
      setGridInicial({ ...grid });
      setDirty(false);
    } catch (err) {
      setError('Erro ao salvar: ' + (err?.message || String(err)));
    } finally {
      setSaving(false);
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
            Acompanhamento <strong>somente desta turma</strong> (participação voluntária). As faltas aqui{' '}
            <strong>não entram</strong> no histórico de frequência do aluno nem na turma regular. Clique na
            célula: vazio → presente → falta → vazio.
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
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 12, background: '#fef2f2', color: '#b91c1c', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6b7280' }}>Carregando diário...</p>
      ) : (
        <>
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
                {diasUteis.map((dt) => {
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
                {diasUteis.map((dt) => {
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
                const pct = percentualFrequenciaAluno(grid, aluno.id, diasUteis);
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
                    {diasUteis.map((dt) => {
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
