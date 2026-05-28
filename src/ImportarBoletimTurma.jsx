import React, { useState, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { extractBoletinsFromPdf, fileToBase64 } from './services/geminiApi';
import {
  CONCEITO_TO_NUM,
  FALTAS_BIMESTRE_KEY,
  getDisciplinasPorTurma,
  inferModoBoletim,
  normalizarDisciplinaSistema,
} from './utils/boletimDisciplinas';

function normalizarNome(n) {
  return String(n || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizarMatricula(m) {
  return String(m || '').trim().replace(/^0+/, '') || '';
}

function parseNotaNum(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const s = String(val).trim();
  if (!s || s === '-' || s === 'X') return null;
  const num = parseFloat(s.replace(',', '.'));
  return Number.isNaN(num) ? null : num;
}

function parseConceito(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).trim().toUpperCase();
  if (CONCEITO_TO_NUM[s] != null) return CONCEITO_TO_NUM[s];
  return null;
}

function montarRowsNotas(alunoId, disciplinasPayload, usaConceito) {
  const rows = [];
  for (const d of disciplinasPayload) {
    const disc = d.disciplina_sistema;
    if (!disc) continue;

    const b1 = usaConceito ? parseConceito(d.bim1_nt) : parseNotaNum(d.bim1_nt);
    const b2 = usaConceito ? parseConceito(d.bim2_nt) : parseNotaNum(d.bim2_nt);
    const b3 = usaConceito ? parseConceito(d.bim3_nt) : parseNotaNum(d.bim3_nt);
    const b4 = usaConceito ? parseConceito(d.bim4_nt) : parseNotaNum(d.bim4_nt);
    const rs1 = usaConceito ? null : parseNotaNum(d.rs1);
    const rs2 = usaConceito ? null : parseNotaNum(d.rs2);

    if (b1 !== null) rows.push({ aluno_id: alunoId, disciplina: disc, bimestre: 1, nota: b1, falta: null, rs1: null, rs2: null });
    if (b2 !== null) {
      rows.push({
        aluno_id: alunoId,
        disciplina: disc,
        bimestre: 2,
        nota: b2,
        falta: null,
        rs1: rs1,
        rs2: null,
      });
    } else if (rs1 !== null) {
      rows.push({ aluno_id: alunoId, disciplina: disc, bimestre: 2, nota: null, falta: null, rs1, rs2: null });
    }
    if (b3 !== null) rows.push({ aluno_id: alunoId, disciplina: disc, bimestre: 3, nota: b3, falta: null, rs1: null, rs2: null });
    if (b4 !== null) {
      rows.push({
        aluno_id: alunoId,
        disciplina: disc,
        bimestre: 4,
        nota: b4,
        falta: null,
        rs1: null,
        rs2,
      });
    } else if (rs2 !== null) {
      rows.push({ aluno_id: alunoId, disciplina: disc, bimestre: 4, nota: null, falta: null, rs1: null, rs2 });
    }
  }
  return rows;
}

function montarRowsFaltas(alunoId, faltas) {
  const rows = [];
  [1, 2, 3, 4].forEach((bim) => {
    const v = faltas[`faltas_bim${bim}`];
    if (v === null || v === undefined || v === '') return;
    const n = parseInt(String(v), 10);
    if (Number.isNaN(n)) return;
    rows.push({
      aluno_id: alunoId,
      disciplina: FALTAS_BIMESTRE_KEY,
      bimestre: bim,
      nota: null,
      falta: n,
      rs1: null,
      rs2: null,
    });
  });
  return rows;
}

/**
 * Importa boletins em PDF (todos os alunos da turma) via Gemini.
 */
function ImportarBoletimTurma({
  turmaId,
  turmaNome = '',
  students = [],
  onImportComplete,
  reavaliarCorAluno,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload');
  const [alunos, setAlunos] = useState([]);
  const [resumo, setResumo] = useState({ alunos: 0, registros: 0, ignorados: 0, erros: [] });

  const modoBoletim = useMemo(() => inferModoBoletim(turmaNome), [turmaNome]);
  const disciplinasTurma = useMemo(() => getDisciplinasPorTurma(turmaNome), [turmaNome]);
  const usaConceito = modoBoletim === 'fund1-conceito';

  const alunosPorNome = useMemo(() => {
    const map = new Map();
    (students || []).forEach((a) => map.set(normalizarNome(a.nome), a));
    return map;
  }, [students]);

  const alunosPorMatricula = useMemo(() => {
    const map = new Map();
    (students || []).forEach((a) => {
      const m = normalizarMatricula(a.matricula);
      if (m) map.set(m, a);
    });
    return map;
  }, [students]);

  const vincularAluno = (row) => {
    if (row.aluno_id) {
      const a = students.find((s) => s.id === row.aluno_id);
      if (a) return a;
    }
    const mat = normalizarMatricula(row.matricula);
    if (mat && alunosPorMatricula.has(mat)) return alunosPorMatricula.get(mat);
    const nome = normalizarNome(row.nome_completo);
    if (nome && alunosPorNome.has(nome)) return alunosPorNome.get(nome);
    return null;
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setError('');
    } else {
      setFile(null);
      setError('Selecione um arquivo PDF.');
    }
  };

  const processarPdf = async () => {
    if (!file || !turmaId) return;
    setLoading(true);
    setError('');
    try {
      const base64 = await fileToBase64(file);
      const data = await extractBoletinsFromPdf({
        pdfBase64: base64,
        mimeType: file.type,
        modoBoletim,
        disciplinas: disciplinasTurma,
      });

      const lista = data?.alunos || [];
      if (lista.length === 0) {
        setError('Nenhum aluno encontrado no PDF. Confira se é o boletim completo da turma (EducaMais).');
        setLoading(false);
        return;
      }

      const mapped = lista.map((a, idx) => {
        const disciplinas = (a.disciplinas || []).map((d) => ({
          ...d,
          disciplina_sistema: normalizarDisciplinaSistema(d.disciplina, turmaNome),
        }));
        const row = {
          id: `al-${idx}`,
          nome_completo: a.nome_completo || '',
          matricula: a.matricula || '',
          disciplinas,
          faltas_bim1: a.faltas_bim1 ?? null,
          faltas_bim2: a.faltas_bim2 ?? null,
          faltas_bim3: a.faltas_bim3 ?? null,
          faltas_bim4: a.faltas_bim4 ?? null,
          confianca: a.confianca || 'media',
          aluno_id: null,
        };
        const aluno = vincularAluno(row);
        if (aluno) row.aluno_id = aluno.id;
        return row;
      });

      setAlunos(mapped);
      setStep('review');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Erro ao processar PDF.');
    } finally {
      setLoading(false);
    }
  };

  const updateAlunoVinculo = (id, alunoId) => {
    setAlunos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, aluno_id: alunoId || null } : a)),
    );
  };

  const salvarNoBanco = async () => {
    if (!turmaId || alunos.length === 0) return;
    setStep('saving');
    setError('');
    const erros = [];
    let alunosSalvos = 0;
    let registros = 0;
    let ignorados = 0;
    const alunosReavaliar = new Set();

    for (const row of alunos) {
      if (!row.aluno_id) {
        ignorados += 1;
        erros.push(`${row.nome_completo}: aluno não encontrado na turma.`);
        continue;
      }

      const notasRows = montarRowsNotas(row.aluno_id, row.disciplinas, usaConceito);
      const faltasRows = montarRowsFaltas(row.aluno_id, row);
      const allRows = [...notasRows, ...faltasRows];

      if (allRows.length === 0) {
        ignorados += 1;
        erros.push(`${row.nome_completo}: nenhuma nota ou falta para salvar.`);
        continue;
      }

      const { error: upsertErr } = await supabase.from('notas_boletim').upsert(allRows, {
        onConflict: 'aluno_id,disciplina,bimestre',
      });

      if (upsertErr) {
        ignorados += 1;
        erros.push(`${row.nome_completo}: ${upsertErr.message}`);
      } else {
        alunosSalvos += 1;
        registros += allRows.length;
        alunosReavaliar.add(row.aluno_id);
      }
    }

    if (reavaliarCorAluno) {
      for (const alunoId of alunosReavaliar) {
        await reavaliarCorAluno(alunoId);
      }
    }

    setResumo({ alunos: alunosSalvos, registros, ignorados, erros });
    setStep('success');
    if (onImportComplete) onImportComplete();
  };

  const countDisciplinasComNota = (row) =>
    (row.disciplinas || []).filter(
      (d) =>
        d.disciplina_sistema &&
        (d.bim1_nt != null || d.bim2_nt != null || d.bim3_nt != null || d.bim4_nt != null),
    ).length;

  return (
    <div
      style={{
        padding: 20,
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        marginBottom: 20,
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 17, color: '#374151' }}>
        <i className="fas fa-file-pdf" style={{ marginRight: 8, color: '#dc2626' }} />
        Importar boletins da turma (IA)
      </h3>

      {step === 'upload' && (
        <div>
          <p style={{ marginBottom: 12, color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
            Envie o PDF do EducaMais com <strong>todos os boletins da turma</strong>. A IA extrai, por aluno:
            notas das colunas <strong>NT</strong> (1º a 4º bimestre), <strong>RS1</strong> e <strong>RS2</strong>, e as{' '}
            <strong>faltas do bimestre</strong> da tabela Faltas. Revise antes de salvar. Modo detectado:{' '}
            <strong>
              {modoBoletim === 'fund1-conceito'
                ? '1º ano (conceitos)'
                : modoBoletim === 'fund1-nota'
                  ? '3º–5º ano'
                  : '6º–9º ano'}
            </strong>
            .
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <input type="file" accept="application/pdf" onChange={handleFileChange} />
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '8px 16px', background: '#dc2626' }}
              disabled={!file || loading || students.length === 0}
              onClick={processarPdf}
            >
              {loading ? 'Analisando PDF...' : 'Extrair com IA'}
            </button>
            <button
              type="button"
              style={{
                padding: '8px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                background: 'white',
                cursor: 'pointer',
              }}
              onClick={() => onImportComplete && onImportComplete()}
            >
              Fechar
            </button>
          </div>
          {students.length === 0 && (
            <p style={{ color: '#92400e', marginTop: 10, fontSize: 14 }}>
              Cadastre os alunos na turma antes (use Importar lista ou Novo Aluno).
            </p>
          )}
          {error && <p style={{ color: '#b91c1c', marginTop: 10, fontSize: 14 }}>{error}</p>}
        </div>
      )}

      {step === 'review' && (
        <div>
          <p style={{ marginBottom: 12, color: '#15803d', fontWeight: 600 }}>
            {alunos.length} aluno(s) no PDF. Vincule quem não foi reconhecido e confira as notas.
          </p>
          {error && <p style={{ color: '#b91c1c', marginBottom: 10 }}>{error}</p>}
          <div
            style={{
              maxHeight: 420,
              overflow: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              marginBottom: 14,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Aluno (PDF)</th>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Matrícula</th>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Na turma</th>
                  <th style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Disciplinas</th>
                  <th style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Faltas (1º–4º)</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: 8 }}>{row.nome_completo}</td>
                    <td style={{ padding: 8, fontSize: 12, color: '#6b7280' }}>{row.matricula || '—'}</td>
                    <td style={{ padding: 8, minWidth: 180 }}>
                      <select
                        value={row.aluno_id || ''}
                        onChange={(e) => updateAlunoVinculo(row.id, e.target.value)}
                        style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
                      >
                        <option value="">— Não vinculado —</option>
                        {[...(students || [])]
                          .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt'))
                          .map((s) => (
                            <option key={s.id} value={String(s.id)}>
                              {s.nome}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td style={{ padding: 8, textAlign: 'center' }}>{countDisciplinasComNota(row)}</td>
                    <td style={{ padding: 8, textAlign: 'center', fontSize: 12 }}>
                      {[row.faltas_bim1, row.faltas_bim2, row.faltas_bim3, row.faltas_bim4]
                        .map((f) => (f != null && f !== '' ? f : '—'))
                        .join(' | ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" style={{ background: '#16a34a' }} onClick={salvarNoBanco}>
              Salvar notas na turma
            </button>
            <button
              type="button"
              style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer' }}
              onClick={() => {
                setStep('upload');
                setAlunos([]);
                setFile(null);
              }}
            >
              Voltar
            </button>
            <button
              type="button"
              style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer' }}
              onClick={() => onImportComplete && onImportComplete()}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {step === 'saving' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p>Salvando notas no banco...</p>
        </div>
      )}

      {step === 'success' && (
        <div style={{ padding: 16 }}>
          <p style={{ color: '#15803d', fontWeight: 600 }}>
            {resumo.alunos} aluno(s) atualizado(s) — {resumo.registros} registro(s) de notas/faltas.
            {resumo.ignorados > 0 && (
              <span style={{ display: 'block', marginTop: 8, color: '#92400e' }}>
                {resumo.ignorados} ignorado(s).
              </span>
            )}
          </p>
          {resumo.erros.length > 0 && (
            <ul style={{ fontSize: 12, color: '#b91c1c', maxHeight: 120, overflow: 'auto' }}>
              {resumo.erros.slice(0, 20).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 12 }}
            onClick={() => {
              setFile(null);
              setAlunos([]);
              setStep('upload');
              if (onImportComplete) onImportComplete();
            }}
          >
            Concluir
          </button>
        </div>
      )}
    </div>
  );
}

export default ImportarBoletimTurma;
