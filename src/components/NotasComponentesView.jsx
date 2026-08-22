import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { getDisciplinasPorTurma } from '../utils/boletimDisciplinas';

const BIMESTRES = [1, 2, 3, 4];

/**
 * Lançamento de notas por componente (ex.: "Prova 1" vale 6, "Trabalho" vale 4).
 * O professor cria as colunas (componentes) que quiser; o sistema soma os
 * valores preenchidos e grava o resultado em notas_boletim automaticamente
 * (gatilho sacp_recalcular_nota_boletim, ver supabase_notas_componentes.sql).
 */
const NotasComponentesView = ({
  turmaId,
  turmaNome,
  students = [],
  professorProfile = null,
  isProfessor = false,
}) => {
  const disciplinasDaTurma = useMemo(() => getDisciplinasPorTurma(turmaNome), [turmaNome]);
  const disciplinaProfessor = professorProfile?.disciplina || '';

  const [bimestre, setBimestre] = useState(1);
  const [disciplina, setDisciplina] = useState(
    isProfessor ? disciplinaProfessor : disciplinasDaTurma[0] || '',
  );
  const [componentes, setComponentes] = useState([]);
  const [valores, setValores] = useState({}); // `${componenteId}|${alunoId}` -> valor
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNovoComponente, setShowNovoComponente] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoValorMaximo, setNovoValorMaximo] = useState('');
  const [savingComponente, setSavingComponente] = useState(false);

  const alunosOrdenados = useMemo(
    () =>
      [...students].sort((a, b) =>
        String(a.nome || '').localeCompare(String(b.nome || ''), 'pt', { sensitivity: 'base' }),
      ),
    [students],
  );

  const chaveValor = (componenteId, alunoId) => `${componenteId}|${alunoId}`;

  const somaValoresMaximos = useMemo(
    () => componentes.reduce((acc, c) => acc + Number(c.valor_maximo || 0), 0),
    [componentes],
  );

  const carregar = useCallback(async () => {
    if (!turmaId || !disciplina) {
      setComponentes([]);
      setValores({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: comps, error: compsError } = await supabase
        .from('notas_componentes')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('disciplina', disciplina)
        .eq('bimestre', bimestre)
        .order('ordem', { ascending: true });
      if (compsError) throw compsError;

      const compIds = (comps || []).map((c) => c.id);
      let vals = [];
      if (compIds.length > 0) {
        const { data: valoresData, error: valoresError } = await supabase
          .from('notas_componentes_valores')
          .select('*')
          .in('componente_id', compIds);
        if (valoresError) throw valoresError;
        vals = valoresData || [];
      }

      const mapa = {};
      vals.forEach((v) => {
        mapa[chaveValor(v.componente_id, v.aluno_id)] = v.valor;
      });

      setComponentes(comps || []);
      setValores(mapa);
    } catch (err) {
      setError('Erro ao carregar notas: ' + (err?.message || String(err)));
      setComponentes([]);
      setValores({});
    } finally {
      setLoading(false);
    }
  }, [turmaId, disciplina, bimestre]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleCriarComponente = async (e) => {
    e.preventDefault();
    const nome = novoNome.trim();
    const valorMaximo = parseFloat(novoValorMaximo);
    if (!nome || !valorMaximo || valorMaximo <= 0) {
      setError('Preencha o nome e um valor máximo maior que zero.');
      return;
    }
    setSavingComponente(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('notas_componentes')
        .insert([
          {
            turma_id: turmaId,
            disciplina,
            bimestre,
            nome,
            valor_maximo: valorMaximo,
            ordem: componentes.length,
            professor_id: professorProfile?.id || null,
          },
        ])
        .select('*')
        .single();
      if (insertError) throw insertError;
      setComponentes((prev) => [...prev, data]);
      setNovoNome('');
      setNovoValorMaximo('');
      setShowNovoComponente(false);
    } catch (err) {
      setError('Erro ao criar componente: ' + (err?.message || String(err)));
    } finally {
      setSavingComponente(false);
    }
  };

  const handleExcluirComponente = async (componenteId) => {
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('notas_componentes')
        .delete()
        .eq('id', componenteId);
      if (deleteError) throw deleteError;
      setComponentes((prev) => prev.filter((c) => c.id !== componenteId));
      setValores((prev) => {
        const next = { ...prev };
        Object.keys(next)
          .filter((k) => k.startsWith(`${componenteId}|`))
          .forEach((k) => delete next[k]);
        return next;
      });
    } catch (err) {
      setError('Erro ao excluir componente: ' + (err?.message || String(err)));
    }
  };

  const handleAlterarValor = (componenteId, alunoId, valorTexto) => {
    const chave = chaveValor(componenteId, alunoId);
    const valor = valorTexto === '' ? null : Number(valorTexto);
    setValores((prev) => ({ ...prev, [chave]: valor }));
  };

  const handleSalvarValor = async (componenteId, alunoId) => {
    const chave = chaveValor(componenteId, alunoId);
    const valor = valores[chave];
    try {
      const { error: upsertError } = await supabase
        .from('notas_componentes_valores')
        .upsert(
          [{ componente_id: componenteId, aluno_id: alunoId, valor: valor === undefined ? null : valor }],
          { onConflict: 'componente_id,aluno_id' },
        );
      if (upsertError) throw upsertError;
    } catch (err) {
      setError('Erro ao salvar nota: ' + (err?.message || String(err)));
    }
  };

  const totalAluno = (alunoId) =>
    componentes.reduce((acc, c) => {
      const v = valores[chaveValor(c.id, alunoId)];
      return acc + (v != null && v !== '' ? Number(v) : 0);
    }, 0);

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
        Adicione alunos à turma <strong>{turmaNome}</strong> para lançar notas.
      </div>
    );
  }

  return (
    <div>
      <div className="diario-header">
        <div>
          <h3 style={{ margin: '0 0 4px', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-clipboard-list" style={{ marginRight: 8 }} />
            Notas — {turmaNome}
          </h3>
          <p style={{ margin: 0, fontSize: '0.85em', color: '#6b7280', lineHeight: 1.45 }}>
            Crie os componentes da avaliação (prova, exercício, trabalho...) e lance a nota de cada aluno.
            O sistema soma tudo e preenche a nota do bimestre automaticamente.
          </p>
        </div>
        <div className="diario-controls">
          {isProfessor ? (
            <span
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: '#f3f4f6',
                fontSize: '0.85em',
                color: '#374151',
              }}
            >
              {disciplinaProfessor || 'Disciplina não definida'}
            </span>
          ) : (
            <select
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}
            >
              {disciplinasDaTurma.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
          <select
            value={bimestre}
            onChange={(e) => setBimestre(parseInt(e.target.value, 10))}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}
          >
            {BIMESTRES.map((b) => (
              <option key={b} value={b}>
                {b}º bimestre
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '8px 16px' }}
            onClick={() => setShowNovoComponente((v) => !v)}
            disabled={isProfessor && !disciplinaProfessor}
          >
            <i className="fas fa-plus" style={{ marginRight: 6 }} />
            Novo componente
          </button>
        </div>
      </div>

      {isProfessor && !disciplinaProfessor && (
        <div style={{ padding: 12, marginBottom: 12, background: '#fffbeb', color: '#92400e', borderRadius: 6 }}>
          Seu cadastro de professor não tem uma disciplina definida. Peça à coordenação para preencher esse
          campo antes de lançar notas.
        </div>
      )}

      {error && (
        <div style={{ padding: 12, marginBottom: 12, background: '#fef2f2', color: '#b91c1c', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {somaValoresMaximos > 10 && (
        <div style={{ padding: 12, marginBottom: 12, background: '#fffbeb', color: '#92400e', borderRadius: 6 }}>
          Os componentes deste bimestre somam {somaValoresMaximos.toLocaleString('pt-BR')} pontos — acima de 10.
          Isso não bloqueia nada, mas confira se é o que você quer.
        </div>
      )}

      {showNovoComponente && (
        <form
          onSubmit={handleCriarComponente}
          style={{
            padding: 14,
            marginBottom: 16,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#f9fafb',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <label>Nome do componente</label>
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: Prova 1, Trabalho em grupo..."
              required
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0, width: 140 }}>
            <label>Vale quantos pontos</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={novoValorMaximo}
              onChange={(e) => setNovoValorMaximo(e.target.value)}
              placeholder="Ex: 6"
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={savingComponente}>
            {savingComponente ? 'Criando...' : 'Criar'}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#6b7280' }}>Carregando notas...</p>
      ) : componentes.length === 0 ? (
        <p style={{ color: '#6b7280' }}>
          Nenhum componente criado para {disciplina || 'esta disciplina'} no {bimestre}º bimestre ainda.
          Clique em "Novo componente" para começar.
        </p>
      ) : (
        <>
          <p className="table-scroll-hint">Deslize horizontalmente para ver todos os componentes.</p>
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
                  {componentes.map((c) => (
                    <th
                      key={c.id}
                      style={{
                        padding: '8px 10px',
                        borderBottom: '1px solid #e5e7eb',
                        minWidth: 110,
                        textAlign: 'center',
                        fontWeight: 500,
                      }}
                    >
                      <div>{c.nome}</div>
                      <div style={{ fontSize: '0.75em', color: '#6b7280', fontWeight: 400 }}>
                        de {Number(c.valor_maximo).toLocaleString('pt-BR')} pts
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExcluirComponente(c.id)}
                        title="Excluir componente"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#dc3545',
                          cursor: 'pointer',
                          fontSize: '0.75em',
                          marginTop: 2,
                        }}
                      >
                        <i className="fas fa-trash" /> excluir
                      </button>
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #e5e7eb',
                      minWidth: 90,
                      textAlign: 'center',
                      fontWeight: 600,
                      background: '#eef2ff',
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {alunosOrdenados.map((aluno) => (
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
                      {aluno.nome}
                    </td>
                    {componentes.map((c) => {
                      const chave = chaveValor(c.id, aluno.id);
                      const valor = valores[chave];
                      return (
                        <td
                          key={c.id}
                          style={{ padding: 6, borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}
                        >
                          <input
                            type="number"
                            min={0}
                            max={c.valor_maximo}
                            step={0.1}
                            value={valor == null ? '' : valor}
                            onChange={(e) => handleAlterarValor(c.id, aluno.id, e.target.value)}
                            onBlur={() => handleSalvarValor(c.id, aluno.id)}
                            style={{
                              width: 70,
                              padding: '6px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: 6,
                              fontSize: 13,
                              textAlign: 'center',
                            }}
                          />
                        </td>
                      );
                    })}
                    <td
                      style={{
                        padding: 6,
                        borderBottom: '1px solid #f0f0f0',
                        textAlign: 'center',
                        fontWeight: 600,
                        background: '#eef2ff',
                        color: totalAluno(aluno.id) < 5 ? '#dc2626' : '#15803d',
                      }}
                    >
                      {totalAluno(aluno.id).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default NotasComponentesView;
