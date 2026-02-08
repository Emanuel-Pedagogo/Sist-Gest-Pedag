import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const DISCIPLINAS_FUNDAMENTAL1 = [
  'Língua Portuguesa',
  'Ensino da História e Geografia',
  'Ciências',
  'Matemática',
  'Ensino Religioso',
  'Educação Física',
  'Ensino da Arte',
];

const DISCIPLINAS_FUNDAMENTAL2 = [
  'Língua Portuguesa',
  'Arte',
  'Educação Física',
  'Língua Inglesa',
  'Matemática',
  'Ciências',
  'História',
  'Geografia',
  'Ensino Religioso',
];

const CONCEITO_TO_NUM = { '': '', N: 1, EP: 2, S: 3 };
const NUM_TO_CONCEITO = { 1: 'N', 2: 'EP', 3: 'S' };

function getDisciplinas(nivelEnsino) {
  if (nivelEnsino === 'fundamental2') return DISCIPLINAS_FUNDAMENTAL2;
  return DISCIPLINAS_FUNDAMENTAL1;
}

function isTurmaPrimeiroAno(turmaNome) {
  if (!turmaNome || typeof turmaNome !== 'string') return false;
  return /1º|1o|1°|primeiro\s*ano/i.test(turmaNome.trim());
}

/** 6º ao 9º ano: usar disciplinas do fundamental2 (nome contém 6º, 7º, 8º, 9º). */
function isTurmaFundamental2(turmaNome) {
  if (!turmaNome || typeof turmaNome !== 'string') return false;
  return /[6-9]º|[6-9]o|[6-9]°|sexto|sétimo|oitavo|nono\s*ano/i.test(turmaNome.trim());
}

function BoletimView({ nivelEnsino = 'fundamental1', alunoId, turmaNome = '' }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [boletim, setBoletim] = useState({});

  const nivelEfetivo = nivelEnsino === 'fundamental2' || isTurmaFundamental2(turmaNome) ? 'fundamental2' : 'fundamental1';
  const disciplinas = getDisciplinas(nivelEfetivo);
  const usaConceito = isTurmaPrimeiroAno(turmaNome);

  useEffect(() => {
    if (!alunoId) return;
    loadBoletim();
  }, [alunoId]);

  function getBoletimKey(disciplina, bimestre) {
    return `${disciplina}|${bimestre}`;
  }

  async function loadBoletim() {
    if (!alunoId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notas_boletim')
        .select('disciplina, bimestre, nota, falta')
        .eq('aluno_id', alunoId);

      if (error) throw error;

      const next = {};
      (data || []).forEach((row) => {
        const key = getBoletimKey(row.disciplina, row.bimestre);
        next[key] = {
          nota: row.nota != null ? Number(row.nota) : '',
          falta: row.falta != null ? Number(row.falta) : '',
        };
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
    return boletim[key] || { nota: '', falta: '' };
  }

  function updateCell(disciplina, bimestre, field, value) {
    const key = getBoletimKey(disciplina, bimestre);
    let parsed = value;
    if (field === 'nota' && usaConceito && (value === 1 || value === 2 || value === 3)) {
      parsed = value;
    } else if (field === 'nota') {
      parsed = value === '' ? '' : (parseFloat(value) ?? '');
    } else {
      parsed = value === '' ? '' : (parseInt(value, 10) ?? '');
    }
    setBoletim((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { nota: '', falta: '' }),
        [field]: parsed,
      },
    }));
  }

  async function handleSave() {
    if (!alunoId) return;
    setSaving(true);
    try {
      const rows = [];
      disciplinas.forEach((disciplina) => {
        [1, 2, 3, 4].forEach((bimestre) => {
          const cell = getCell(disciplina, bimestre);
          const nota = cell.nota === '' ? null : (usaConceito ? Number(cell.nota) : Number(cell.nota));
          const falta = cell.falta === '' ? null : Number(cell.falta);
          rows.push({
            aluno_id: alunoId,
            disciplina,
            bimestre,
            nota,
            falta,
          });
        });
      });

      const { error } = await supabase.from('notas_boletim').upsert(rows, {
        onConflict: 'aluno_id,disciplina,bimestre',
      });

      if (error) throw error;
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
  const isNotaBaixa = (v) => !usaConceito && v !== '' && v != null && Number(v) < 6;

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
        Carregando boletim...
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
                3º Bimestre
              </th>
              <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' }}>
                4º Bimestre
              </th>
            </tr>
            <tr style={{ background: '#fafafa', fontSize: 12, color: '#6b7280' }}>
              <th style={{ padding: '6px 14px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }} />
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Nota / Falta</th>
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Nota / Falta</th>
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Nota / Falta</th>
              <th style={{ padding: '6px 14px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>Nota / Falta</th>
            </tr>
          </thead>
          <tbody>
            {disciplinas.map((disciplina, idx) => (
              <tr key={disciplina} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid #eee', fontWeight: 500, color: '#374151' }}>
                  {disciplina}
                </td>
                {[1, 2, 3, 4].map((bimestre) => {
                  const cell = getCell(disciplina, bimestre);
                  const notaBaixa = isNotaBaixa(cell.nota);
                  return (
                    <td key={bimestre} style={{ padding: '8px 10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {usaConceito ? (
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
                          )}
                          <input
                            type="number"
                            min={0}
                            placeholder="Falta"
                            value={cell.falta === '' ? '' : cell.falta}
                            onChange={(e) => updateCell(disciplina, bimestre, 'falta', e.target.value)}
                            style={{
                              width: 48,
                              padding: '6px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: 6,
                              fontSize: 13,
                              textAlign: 'center',
                            }}
                          />
                        </div>
                      ) : (
                        <span style={{ color: notaBaixa ? '#dc2626' : 'inherit', fontWeight: notaBaixa ? 600 : 400 }}>
                          {formatNota(cell.nota)} / {formatFalta(cell.falta)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BoletimView;
