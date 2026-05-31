import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabaseClient';
import { parseLinhasListaAlunos } from './listaAlunosPdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function normalizarNome(n) {
  return String(n || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Importa alunos a partir do PDF "Lista de Alunos" (turma escolarização). */
function ImportarListaAlunos({ turmaId, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload');
  const [resumoImport, setResumoImport] = useState({ inseridos: 0, ignorados: 0, erros: [] });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
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
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let textoCompleto = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const pagina = await pdf.getPage(p);
        const conteudo = await pagina.getTextContent();
        textoCompleto += conteudo.items.map((item) => item.str).join(' ') + '\n';
      }

      const extraidos = parseLinhasListaAlunos(textoCompleto);
      if (extraidos.length === 0) {
        setError(
          'Não foi possível ler alunos neste PDF. Use a lista "Lista de Alunos" do EducaMais (colunas Mat. Coletor, Nome, Data Nascimento, Responsável).',
        );
        setLoading(false);
        return;
      }
      setLinhas(extraidos);
      setStep('review');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Erro ao ler o PDF.');
    } finally {
      setLoading(false);
    }
  };

  const salvarNoBanco = async () => {
    if (!turmaId || linhas.length === 0) return;
    setStep('saving');
    setError('');
    try {
      const seenNome = new Set();
      const linhasUnicas = [];
      for (const row of linhas) {
        const k = normalizarNome(row.nome);
        if (seenNome.has(k)) continue;
        seenNome.add(k);
        linhasUnicas.push(row);
      }

      const { data: existentes, error: errEx } = await supabase
        .from('alunos')
        .select('id, nome, matricula, data_nascimento')
        .eq('turma_id', turmaId);
      if (errEx) throw errEx;

      const chavesNome = new Set((existentes || []).map((a) => normalizarNome(a.nome)));
      const chavesMatricula = new Set(
        (existentes || [])
          .map((a) => (a.matricula != null && String(a.matricula).trim() !== '' ? String(a.matricula).trim() : null))
          .filter(Boolean),
      );

      const novos = [];
      let ignorados = 0;
      for (const row of linhasUnicas) {
        const nomeN = normalizarNome(row.nome);
        if (chavesNome.has(nomeN)) {
          ignorados += 1;
          continue;
        }
        const mat = row.matriculaColetor || '';
        if (mat && chavesMatricula.has(mat)) {
          ignorados += 1;
          continue;
        }
        novos.push(row);
        chavesNome.add(nomeN);
        if (mat) chavesMatricula.add(mat);
      }

      let inseridos = 0;
      const erros = [];
      for (const row of novos) {
        const payload = {
          nome: row.nome,
          data_nascimento: row.data_nascimento,
          turma_id: turmaId,
          etiqueta_cor: 'azul',
          matricula: row.matriculaColetor || null,
          responsavel: row.nome_responsavel,
          contato: null,
        };
        const { error: insErr } = await supabase.from('alunos').insert([payload]);
        if (insErr) {
          erros.push(`${row.nome}: ${insErr.message}`);
        } else {
          inseridos += 1;
        }
      }

      setResumoImport({ inseridos, ignorados, erros });
      setStep('success');
      if (onImportComplete) onImportComplete();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Erro ao salvar alunos.');
      setStep('review');
    }
  };

  return (
    <div className="import-panel">
      <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 17, color: '#374151' }}>
        <i className="fas fa-users" style={{ marginRight: 8, color: 'var(--primary)' }} />
        Importar lista de alunos (PDF)
      </h3>

      {step === 'upload' && (
        <div>
          <p style={{ marginBottom: 12, color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
            Envie o PDF <strong>Lista de Alunos</strong> da turma (EducaMais). Serão lidos: número do coletor (matrícula
            provisória), nome, data de nascimento e responsável. Quem já existir na turma (mesmo nome) será ignorado.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <input type="file" accept=".pdf" onChange={handleFileChange} />
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '8px 16px' }}
              disabled={!file || loading}
              onClick={processarPdf}
            >
              {loading ? 'Lendo PDF...' : 'Extrair alunos'}
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
          {error && <p style={{ color: '#b91c1c', marginTop: 10, fontSize: 14 }}>{error}</p>}
        </div>
      )}

      {step === 'review' && (
        <div>
          <p style={{ marginBottom: 12, color: '#15803d', fontWeight: 600 }}>
            {linhas.length} aluno(s) encontrado(s) no PDF. Confira e cadastre na turma.
          </p>
          {error && <p style={{ color: '#b91c1c', marginBottom: 10 }}>{error}</p>}
          <div className="import-table-wrap" style={{ maxHeight: 320, marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Coletor</th>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Nome</th>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Nascimento</th>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: 8 }}>{r.matriculaColetor}</td>
                    <td style={{ padding: 8 }}>{r.nome}</td>
                    <td style={{ padding: 8 }}>{r.data_nascimento}</td>
                    <td style={{ padding: 8, color: '#4b5563', fontSize: 12 }}>{r.nome_responsavel || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="import-actions">
            <button type="button" className="btn-primary" onClick={salvarNoBanco}>
              Cadastrar na turma
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
              onClick={() => {
                setStep('upload');
                setLinhas([]);
                setFile(null);
              }}
            >
              Voltar
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
              Cancelar
            </button>
          </div>
        </div>
      )}

      {step === 'saving' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p>Cadastrando alunos...</p>
        </div>
      )}

      {step === 'success' && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <p style={{ color: '#15803d', fontWeight: 600 }}>
            {resumoImport.inseridos} aluno(s) cadastrado(s).
            {resumoImport.ignorados > 0 && (
              <span style={{ display: 'block', marginTop: 8, color: '#92400e', fontWeight: 500 }}>
                {resumoImport.ignorados} ignorado(s) (já existiam na turma ou matrícula duplicada).
              </span>
            )}
          </p>
          {resumoImport.erros.length > 0 && (
            <ul style={{ textAlign: 'left', fontSize: 12, color: '#b91c1c', maxHeight: 120, overflow: 'auto' }}>
              {resumoImport.erros.slice(0, 15).map((e, i) => (
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
              setLinhas([]);
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

export default ImportarListaAlunos;
