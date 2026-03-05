import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

/** Disciplinas do 1º ao 5º ano (Fundamental I). */
const DISCIPLINAS_ATE_5_ANO = [
  'LINGUA PORTUGUESA',
  'ENSINO DA HISTÓRIA E GEOGRAFIA',
  'CIÊNCIAS',
  'MATEMÁTICA',
  'ENSINO RELIGIOSO',
  'EDUCAÇÃO FÍSICA',
  'ENSINO DA ARTE',
];

/** Disciplinas do 6º ao 9º ano (Fundamental II). */
const DISCIPLINAS_6_AO_9_ANO = [
  'LINGUA PORTUGUESA',
  'HISTÓRIA',
  'GEOGRAFIA',
  'CIÊNCIAS',
  'MATEMÁTICA',
  'EDUCAÇÃO FÍSICA',
  'ENSINO DA ARTE',
  'LÍNGUA ESTRANGEIRA - INGLÊS',
  'ESTUDOS AMAZÔNICOS',
];

const CONCEITO_TO_NUM = { '': '', N: 1, EP: 2, S: 3 };
const NUM_TO_CONCEITO = { 1: 'N', 2: 'EP', 3: 'S' };

/** Chave usada no banco para armazenar faltas do bimestre (uma por bimestre, não por disciplina). */
const FALTAS_BIMESTRE_KEY = 'Faltas do Bimestre';

/** Retorna true se a turma for 1º, 2º, 3º, 4º ou 5º ano. */
function isTurmaAteQuintoAno(turmaNome) {
  if (!turmaNome || typeof turmaNome !== 'string') return false;
  const t = turmaNome.trim();
  return /[1-5]º|[1-5]o|[1-5]°|primeiro|segundo|terceiro|quarto|quinto\s*ano/i.test(t);
}

function getDisciplinas(turmaNome) {
  return isTurmaAteQuintoAno(turmaNome) ? DISCIPLINAS_ATE_5_ANO : DISCIPLINAS_6_AO_9_ANO;
}

function isTurmaPrimeiroAno(turmaNome) {
  if (!turmaNome || typeof turmaNome !== 'string') return false;
  return /1º|1o|1°|primeiro\s*ano/i.test(turmaNome.trim());
}

/** Retorna true se a turma for Pré I ou Pré II (educação infantil). */
function isTurmaPreEscola(turmaNome) {
  if (!turmaNome || typeof turmaNome !== 'string') return false;
  const t = turmaNome.trim().toLowerCase();
  return /pré\s*i\b|pre\s*i\b|pré\s*1|pre\s*1/i.test(t) || /pré\s*ii|pre\s*ii|pré\s*2|pre\s*2/i.test(t);
}

function BoletimView({ nivelEnsino, alunoId, turmaNome = '', onEtiquetaAtualizada }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [boletim, setBoletim] = useState({});
  /** Relatórios de avaliação e acompanhamento (Pré I e Pré II): bimestre -> texto */
  const [relatoriosPre, setRelatoriosPre] = useState({ 1: '', 2: '', 3: '', 4: '' });

  const isPreEscola = isTurmaPreEscola(turmaNome);
  const disciplinas = getDisciplinas(turmaNome);
  const usaConceito = isTurmaPrimeiroAno(turmaNome);

  useEffect(() => {
    if (!alunoId) return;
    if (isPreEscola) loadRelatoriosPre();
    else loadBoletim();
  }, [alunoId, isPreEscola]);

  async function loadRelatoriosPre() {
    if (!alunoId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('relatorio_avaliacao_pre')
        .select('bimestre, relatorio')
        .eq('aluno_id', alunoId);
      if (error) throw error;
      const next = { 1: '', 2: '', 3: '', 4: '' };
      (data || []).forEach((row) => {
        next[row.bimestre] = row.relatorio != null ? String(row.relatorio) : '';
      });
      setRelatoriosPre(next);
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
      setRelatoriosPre({ 1: '', 2: '', 3: '', 4: '' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRelatoriosPre() {
    if (!alunoId) return;
    setSaving(true);
    try {
      const rows = [1, 2, 3, 4].map((bimestre) => ({
        aluno_id: alunoId,
        bimestre,
        relatorio: relatoriosPre[bimestre]?.trim() || null,
      }));
      const { error } = await supabase.from('relatorio_avaliacao_pre').upsert(rows, {
        onConflict: 'aluno_id,bimestre',
      });
      if (error) throw error;
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar relatórios:', err);
      alert('Erro ao salvar relatórios: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  }

  function getBoletimKey(disciplina, bimestre) {
    return `${disciplina}|${bimestre}`;
  }

  async function loadBoletim() {
    if (!alunoId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notas_boletim')
        .select('disciplina, bimestre, nota, falta, rs1, rs2')
        .eq('aluno_id', alunoId);

      if (error) throw error;

      const next = {};
      (data || []).forEach((row) => {
        const key = getBoletimKey(row.disciplina, row.bimestre);
        next[key] = {
          nota: row.nota != null ? Number(row.nota) : '',
          falta: row.falta != null ? Number(row.falta) : '',
          rs1: row.bimestre === 2 && row.rs1 != null ? Number(row.rs1) : '',
          rs2: row.bimestre === 4 && row.rs2 != null ? Number(row.rs2) : '',
        };
      });
      // Garantir as 4 células de "Faltas do Bimestre" (podem não existir no banco ainda)
      [1, 2, 3, 4].forEach((b) => {
        const key = getBoletimKey(FALTAS_BIMESTRE_KEY, b);
        if (!next[key]) next[key] = { nota: '', falta: '' };
      });
      setBoletim(next);
    } catch (err) {
      console.error('Erro ao carregar boletim:', err);
      setBoletim({});
    } finally {
      setLoading(false);
    }
  }

  function getCell(disciplina, bimestre) {
    const key = getBoletimKey(disciplina, bimestre);
    return boletim[key] || { nota: '', falta: '', rs1: '', rs2: '' };
  }

  function updateCell(disciplina, bimestre, field, value) {
    const key = getBoletimKey(disciplina, bimestre);
    let parsed = value;
    if (field === 'nota' && usaConceito && (value === 1 || value === 2 || value === 3)) {
      parsed = value;
    } else if (field === 'nota' || field === 'rs1' || field === 'rs2') {
      parsed = value === '' ? '' : (parseFloat(value) ?? '');
    } else {
      parsed = value === '' ? '' : (parseInt(value, 10) ?? '');
    }
    setBoletim((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { nota: '', falta: '', rs1: '', rs2: '' }),
        [field]: parsed,
      },
    }));
  }

  /** Atualiza RS1 (usa célula do 2º bim) ou RS2 (célula do 4º bim). */
  function updateRs(disciplina, rsField, value) {
    const bimestre = rsField === 'rs1' ? 2 : 4;
    updateCell(disciplina, bimestre, rsField, value);
  }

  async function handleSave() {
    if (!alunoId) return;
    setSaving(true);
    try {
      const rows = [];
      // Linhas por disciplina: apenas nota (sem falta por disciplina)
      disciplinas.forEach((disciplina) => {
        [1, 2, 3, 4].forEach((bimestre) => {
          const cell = getCell(disciplina, bimestre);
          const nota = cell.nota === '' ? null : (usaConceito ? Number(cell.nota) : Number(cell.nota));
          rows.push({
            aluno_id: alunoId,
            disciplina,
            bimestre,
            nota,
            falta: null,
            rs1: bimestre === 2 ? (cell.rs1 === '' ? null : Number(cell.rs1)) : null,
            rs2: bimestre === 4 ? (cell.rs2 === '' ? null : Number(cell.rs2)) : null,
          });
        });
      });
      // Linha de faltas do bimestre (uma por bimestre)
      [1, 2, 3, 4].forEach((bimestre) => {
        const cell = getCell(FALTAS_BIMESTRE_KEY, bimestre);
        const falta = cell.falta === '' ? null : Number(cell.falta);
        rows.push({
          aluno_id: alunoId,
          disciplina: FALTAS_BIMESTRE_KEY,
          bimestre,
          nota: null,
          falta,
        });
      });

      const { error } = await supabase.from('notas_boletim').upsert(rows, {
        onConflict: 'aluno_id,disciplina,bimestre',
      });

      if (error) throw error;

      // Se status ficou Reprovado, atualiza etiqueta do aluno para vermelho (prioridade)
      if (isAprovado() === false) {
        const { error: errEtiqueta } = await supabase
          .from('alunos')
          .update({ etiqueta_cor: 'vermelho' })
          .eq('id', alunoId);
        if (!errEtiqueta && onEtiquetaAtualizada) onEtiquetaAtualizada('vermelho');
      }

      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar boletim:', err);
      alert('Erro ao salvar boletim: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  }

  const formatNota = (v) => {
    if (v === '' || v == null) return '-';
    if (usaConceito && (v === 1 || v === 2 || v === 3)) return NUM_TO_CONCEITO[v];
    return String(v);
  };
  const formatFalta = (v) => (v !== '' && v != null ? String(v) : '-');
  const formatRs = (v) => (v !== '' && v != null ? String(Number(v)) : '-');
  /** Nota < 5: vermelho; nota >= 5: azul (só para notas numéricas). */
  const isNotaBaixa = (v) => !usaConceito && v !== '' && v != null && Number(v) < 5;
  const isNotaOk = (v) => !usaConceito && v !== '' && v != null && Number(v) >= 5;

  /** Converte valor de célula para número (vazio = null). */
  function toNum(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  /**
   * Média final: B1 e B3 peso 2, B2 e B4 peso 3.
   * Se RS1 preenchida, substitui a menor nota do 1º semestre (B1,B2); a nota de recuperação
   * entra no cálculo com o peso da nota que foi substituída (2 se substituiu B1, 3 se B2).
   * Idem para RS2 no 2º semestre (B3,B4).
   * Retorna null se não for possível calcular (conceito ou nota faltando).
   */
  function computeMF(disciplina) {
    if (usaConceito) return null;
    const b1 = toNum(getCell(disciplina, 1).nota);
    const b2 = toNum(getCell(disciplina, 2).nota);
    const b3 = toNum(getCell(disciplina, 3).nota);
    const b4 = toNum(getCell(disciplina, 4).nota);
    if (b1 == null || b2 == null || b3 == null || b4 == null) return null;
    const rs1 = toNum(getCell(disciplina, 2).rs1);
    const rs2 = toNum(getCell(disciplina, 4).rs2);

    // 1º semestre: peso B1=2, B2=3. Se há RS1, substitui a menor e aplica o peso da nota substituída à recuperação.
    let contribSem1;
    if (rs1 != null) {
      const menorBim1 = b1 <= b2 ? 1 : 2; // 1 = B1 foi a menor, 2 = B2 foi a menor
      const pesoSubstituido = menorBim1 === 1 ? 2 : 3;
      const outraNota = menorBim1 === 1 ? b2 : b1;
      const pesoOutra = menorBim1 === 1 ? 3 : 2;
      contribSem1 = outraNota * pesoOutra + rs1 * pesoSubstituido;
    } else {
      contribSem1 = b1 * 2 + b2 * 3;
    }

    // 2º semestre: peso B3=2, B4=3. Se há RS2, substitui a menor e aplica o peso da nota substituída à recuperação.
    let contribSem2;
    if (rs2 != null) {
      const menorBim2 = b3 <= b4 ? 3 : 4; // 3 = B3 foi a menor, 4 = B4 foi a menor
      const pesoSubstituido = menorBim2 === 3 ? 2 : 3;
      const outraNota = menorBim2 === 3 ? b4 : b3;
      const pesoOutra = menorBim2 === 3 ? 3 : 2;
      contribSem2 = outraNota * pesoOutra + rs2 * pesoSubstituido;
    } else {
      contribSem2 = b3 * 2 + b4 * 3;
    }

    return (contribSem1 + contribSem2) / 10;
  }

  /** Retorna true se todas as MFs (numéricas) forem >= 5. */
  function isAprovado() {
    const mfs = disciplinas.map((d) => computeMF(d)).filter((v) => v != null);
    if (mfs.length === 0) return null;
    return mfs.every((mf) => mf >= 5);
  }

  function renderCellNota(disciplina, bimestre) {
    const cell = getCell(disciplina, bimestre);
    const notaBaixa = isNotaBaixa(cell.nota);
    const notaOk = isNotaOk(cell.nota);
    const corNota = notaBaixa ? '#dc2626' : notaOk ? '#1e40af' : 'inherit';
    if (isEditing) {
      return usaConceito ? (
        <select
          value={cell.nota === 1 || cell.nota === 2 || cell.nota === 3 ? NUM_TO_CONCEITO[cell.nota] : ''}
          onChange={(e) => {
            const v = e.target.value;
            updateCell(disciplina, bimestre, 'nota', v === '' ? '' : CONCEITO_TO_NUM[v]);
          }}
          style={{
            minWidth: 56,
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            background: 'white',
          }}
        >
          <option value="">—</option>
          <option value="N">N</option>
          <option value="EP">EP</option>
          <option value="S">S</option>
        </select>
      ) : (
        <input
          type="number"
          min={0}
          max={10}
          step={0.5}
          placeholder="Nota"
          value={cell.nota === '' ? '' : cell.nota}
          onChange={(e) => updateCell(disciplina, bimestre, 'nota', e.target.value)}
          style={{
            width: 56,
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            textAlign: 'center',
          }}
        />
      );
    }
    return (
      <span style={{ color: corNota, fontWeight: notaBaixa || notaOk ? 600 : 400 }}>
        {formatNota(cell.nota)}
      </span>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
        {isPreEscola ? 'Carregando relatórios...' : 'Carregando boletim...'}
      </div>
    );
  }

  if (isPreEscola) {
    const labels = { 1: '1º Bimestre', 2: '2º Bimestre', 3: '3º Bimestre', 4: '4º Bimestre' };
    return (
      <div style={{ padding: 20, maxWidth: 960, margin: '0 auto' }}>
        <h3 style={{ marginBottom: 16, color: '#374151', fontSize: 18 }}>
          Registro de avaliação e acompanhamento
        </h3>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isEditing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              border: '1px solid #ddd',
              borderRadius: 8,
              background: isEditing ? '#f0f0f0' : 'white',
              color: '#333',
              cursor: isEditing ? 'default' : 'pointer',
            }}
          >
            <i className="fas fa-pencil-alt" /> Editar
          </button>
          <button
            type="button"
            onClick={handleSaveRelatoriosPre}
            disabled={!isEditing || saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              border: 'none',
              borderRadius: 8,
              background: !isEditing || saving ? '#ccc' : '#2e7d32',
              color: 'white',
              cursor: !isEditing || saving ? 'default' : 'pointer',
            }}
          >
            <i className="fas fa-check" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[1, 2, 3, 4].map((bimestre) => (
            <div key={bimestre} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, background: '#fafafa' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                {labels[bimestre]}
              </label>
              {isEditing ? (
                <textarea
                  value={relatoriosPre[bimestre] || ''}
                  onChange={(e) => setRelatoriosPre((prev) => ({ ...prev, [bimestre]: e.target.value }))}
                  placeholder="Digite o relatório de avaliação e acompanhamento deste bimestre..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: 12,
                    minHeight: 80,
                    background: 'white',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 14,
                    color: '#374151',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {relatoriosPre[bimestre]?.trim() || '—'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          disabled={isEditing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            border: '1px solid #ddd',
            borderRadius: 8,
            background: isEditing ? '#f0f0f0' : 'white',
            color: '#333',
            cursor: isEditing ? 'default' : 'pointer',
          }}
        >
          <i className="fas fa-pencil-alt" /> Editar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isEditing || saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            border: 'none',
            borderRadius: 8,
            background: !isEditing || saving ? '#ccc' : '#2e7d32',
            color: 'white',
            cursor: !isEditing || saving ? 'default' : 'pointer',
          }}
        >
          <i className="fas fa-check" /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' }}>
                Disciplina
              </th>
              <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' }}>
                1º Bimestre
              </th>
              <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' }}>
                2º Bimestre
              </th>
              <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' }}>
                RS1
              </th>
              <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' }}>
                3º Bimestre
              </th>
              <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' }}>
                4º Bimestre
              </th>
              <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' }}>
                RS2
              </th>
              <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' }}>
                MF
              </th>
            </tr>
            <tr style={{ background: '#fafafa', fontSize: 12, color: '#6b7280' }}>
              <th style={{ padding: '6px 14px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }} />
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Nota</th>
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Nota</th>
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Rec. Sem.</th>
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Nota</th>
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Nota</th>
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Rec. Sem.</th>
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Média Final</th>
            </tr>
          </thead>
          <tbody>
            {disciplinas.map((disciplina, idx) => {
              const cellB2 = getCell(disciplina, 2);
              const cellB4 = getCell(disciplina, 4);
              const mf = computeMF(disciplina);
              return (
                <tr key={disciplina} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #eee', fontWeight: 500, color: '#374151' }}>
                    {disciplina}
                  </td>
                  {/* 1º Bimestre */}
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    {renderCellNota(disciplina, 1)}
                  </td>
                  {/* 2º Bimestre */}
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    {renderCellNota(disciplina, 2)}
                  </td>
                  {/* RS1 */}
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', textAlign: 'center', background: '#fefce8' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        placeholder="RS1"
                        value={cellB2.rs1 === '' ? '' : cellB2.rs1}
                        onChange={(e) => updateRs(disciplina, 'rs1', e.target.value)}
                        style={{
                          width: 56,
                          padding: '6px 8px',
                          border: '1px solid #eab308',
                          borderRadius: 6,
                          fontSize: 13,
                          textAlign: 'center',
                          background: 'white',
                        }}
                      />
                    ) : (
                      <span>{formatRs(cellB2.rs1)}</span>
                    )}
                  </td>
                  {/* 3º Bimestre */}
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    {renderCellNota(disciplina, 3)}
                  </td>
                  {/* 4º Bimestre */}
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    {renderCellNota(disciplina, 4)}
                  </td>
                  {/* RS2 */}
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', textAlign: 'center', background: '#fefce8' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        placeholder="RS2"
                        value={cellB4.rs2 === '' ? '' : cellB4.rs2}
                        onChange={(e) => updateRs(disciplina, 'rs2', e.target.value)}
                        style={{
                          width: 56,
                          padding: '6px 8px',
                          border: '1px solid #eab308',
                          borderRadius: 6,
                          fontSize: 13,
                          textAlign: 'center',
                          background: 'white',
                        }}
                      />
                    ) : (
                      <span>{formatRs(cellB4.rs2)}</span>
                    )}
                  </td>
                  {/* MF */}
                  <td style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid #eee',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: mf != null && mf < 5 ? '#dc2626' : mf != null ? '#15803d' : 'inherit',
                  }}>
                    {mf != null ? mf.toFixed(2) : '-'}
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: '#eef2ff', borderTop: '2px solid #c7d2fe' }}>
              <td style={{ padding: '10px 14px', borderBottom: '1px solid #c7d2fe', fontWeight: 600, color: '#3730a3' }}>
                FALTAS DO BIMESTRE
              </td>
              {/* Falta 1º bim (alinhada com coluna 1º Bimestre) */}
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #c7d2fe', textAlign: 'center' }}>
                {isEditing ? (
                  <input
                    type="number"
                    min={0}
                    placeholder="Faltas"
                    value={getCell(FALTAS_BIMESTRE_KEY, 1).falta === '' ? '' : getCell(FALTAS_BIMESTRE_KEY, 1).falta}
                    onChange={(e) => updateCell(FALTAS_BIMESTRE_KEY, 1, 'falta', e.target.value)}
                    style={{
                      width: 56,
                      padding: '6px 8px',
                      border: '1px solid #818cf8',
                      borderRadius: 6,
                      fontSize: 13,
                      textAlign: 'center',
                      background: 'white',
                    }}
                  />
                ) : (
                  <span style={{ fontWeight: 500 }}>{formatFalta(getCell(FALTAS_BIMESTRE_KEY, 1).falta)}</span>
                )}
              </td>
              {/* Falta 2º bim (alinhada com coluna 2º Bimestre) */}
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #c7d2fe', textAlign: 'center' }}>
                {isEditing ? (
                  <input
                    type="number"
                    min={0}
                    placeholder="Faltas"
                    value={getCell(FALTAS_BIMESTRE_KEY, 2).falta === '' ? '' : getCell(FALTAS_BIMESTRE_KEY, 2).falta}
                    onChange={(e) => updateCell(FALTAS_BIMESTRE_KEY, 2, 'falta', e.target.value)}
                    style={{
                      width: 56,
                      padding: '6px 8px',
                      border: '1px solid #818cf8',
                      borderRadius: 6,
                      fontSize: 13,
                      textAlign: 'center',
                      background: 'white',
                    }}
                  />
                ) : (
                  <span style={{ fontWeight: 500 }}>{formatFalta(getCell(FALTAS_BIMESTRE_KEY, 2).falta)}</span>
                )}
              </td>
              {/* Célula vazia (sob RS1) */}
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #c7d2fe', textAlign: 'center' }} />
              {/* Falta 3º bim (alinhada com coluna 3º Bimestre) */}
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #c7d2fe', textAlign: 'center' }}>
                {isEditing ? (
                  <input
                    type="number"
                    min={0}
                    placeholder="Faltas"
                    value={getCell(FALTAS_BIMESTRE_KEY, 3).falta === '' ? '' : getCell(FALTAS_BIMESTRE_KEY, 3).falta}
                    onChange={(e) => updateCell(FALTAS_BIMESTRE_KEY, 3, 'falta', e.target.value)}
                    style={{
                      width: 56,
                      padding: '6px 8px',
                      border: '1px solid #818cf8',
                      borderRadius: 6,
                      fontSize: 13,
                      textAlign: 'center',
                      background: 'white',
                    }}
                  />
                ) : (
                  <span style={{ fontWeight: 500 }}>{formatFalta(getCell(FALTAS_BIMESTRE_KEY, 3).falta)}</span>
                )}
              </td>
              {/* Falta 4º bim (alinhada com coluna 4º Bimestre) */}
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #c7d2fe', textAlign: 'center' }}>
                {isEditing ? (
                  <input
                    type="number"
                    min={0}
                    placeholder="Faltas"
                    value={getCell(FALTAS_BIMESTRE_KEY, 4).falta === '' ? '' : getCell(FALTAS_BIMESTRE_KEY, 4).falta}
                    onChange={(e) => updateCell(FALTAS_BIMESTRE_KEY, 4, 'falta', e.target.value)}
                    style={{
                      width: 56,
                      padding: '6px 8px',
                      border: '1px solid #818cf8',
                      borderRadius: 6,
                      fontSize: 13,
                      textAlign: 'center',
                      background: 'white',
                    }}
                  />
                ) : (
                  <span style={{ fontWeight: 500 }}>{formatFalta(getCell(FALTAS_BIMESTRE_KEY, 4).falta)}</span>
                )}
              </td>
              {/* Célula vazia (sob RS2) */}
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #c7d2fe', textAlign: 'center' }} />
              {/* Célula vazia (sob MF) */}
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #c7d2fe', textAlign: 'center' }} />
            </tr>
            {/* Etiqueta Aprovado / Reprovado */}
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <td colSpan={7} style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>
                Situação final
              </td>
              <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                {isAprovado() === true && (
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    background: '#dcfce7',
                    color: '#166534',
                    border: '1px solid #86efac',
                  }}>
                    APROVADO
                  </span>
                )}
                {isAprovado() === false && (
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                  }}>
                    REPROVADO
                  </span>
                )}
                {isAprovado() === null && (
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BoletimView;
