import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabaseClient';
import { parseLinhasListaAlunos } from './listaAlunosPdf';
import { extractAlunosFromArquivo, mapearColunasPlanilha, fileToBase64 } from './services/geminiApi';
import {
  EXTENSOES_ACEITAS,
  aplicarMapeamento,
  comprimirImagem,
  detectarTipo,
  juntarSemRepetir,
  lerPlanilha,
  normalizarData,
} from './utils/importarAlunosArquivo';

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

/** Extrai o texto de todas as páginas de um PDF (leitura local, sem IA). */
async function lerTextoPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let texto = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const pagina = await pdf.getPage(p);
    const conteudo = await pagina.getTextContent();
    texto += conteudo.items.map((item) => item.str).join(' ') + '\n';
  }
  return texto;
}

/**
 * Importa alunos para a turma a partir de foto, CSV, Excel ou PDF.
 *
 * PDF no layout "Lista de Alunos" do EducaMais é lido localmente (instantâneo e
 * exato). Os demais formatos — e PDFs fora desse layout — passam pela IA.
 */
function ImportarListaAlunos({ turmaId, onImportComplete }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState('');
  const [linhas, setLinhas] = useState([]);
  const [origens, setOrigens] = useState([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload');
  const [resumoImport, setResumoImport] = useState({ inseridos: 0, ignorados: 0, erros: [] });

  const handleFileChange = (e) => {
    const selecionados = Array.from(e.target.files || []);
    const invalidos = selecionados.filter((f) => !detectarTipo(f));
    if (invalidos.length > 0) {
      setFiles([]);
      setError(`Formato não aceito: ${invalidos.map((f) => f.name).join(', ')}. Envie foto, PDF, CSV ou Excel.`);
      return;
    }
    setFiles(selecionados);
    setError('');
  };

  /** Lê um arquivo e devolve { linhas, origem }. */
  const processarArquivo = async (file) => {
    const tipo = detectarTipo(file);

    if (tipo === 'pdf') {
      // Caminho rápido: layout conhecido do EducaMais, sem custo de IA.
      const texto = await lerTextoPdf(file);
      const local = parseLinhasListaAlunos(texto);
      if (local.length > 0) {
        return {
          origem: `${file.name}: ${local.length} aluno(s) — lista do EducaMais`,
          linhas: local.map((r) => ({
            nome: r.nome,
            data_nascimento: r.data_nascimento || null,
            matricula: r.matriculaColetor || null,
            responsavel: r.nome_responsavel || null,
            contato: null,
            revisar: false,
          })),
        };
      }
      // Fora do layout conhecido: manda o PDF para a IA.
      const base64 = await fileToBase64(file);
      const res = await extractAlunosFromArquivo({ arquivoBase64: base64, mimeType: 'application/pdf' });
      const lidos = normalizarSaidaIa(res);
      return { origem: `${file.name}: ${lidos.length} aluno(s) — lido com IA`, linhas: lidos };
    }

    if (tipo === 'imagem') {
      const { base64, mimeType } = await comprimirImagem(file);
      const res = await extractAlunosFromArquivo({ arquivoBase64: base64, mimeType });
      const lidos = normalizarSaidaIa(res);
      return { origem: `${file.name}: ${lidos.length} aluno(s) — foto lida com IA`, linhas: lidos };
    }

    // Planilha: a IA só identifica as colunas; as linhas são lidas aqui, exatas.
    const todasLinhas = await lerPlanilha(file);
    if (todasLinhas.length === 0) {
      return { origem: `${file.name}: planilha vazia`, linhas: [] };
    }
    const amostra = todasLinhas.slice(0, 6);
    const res = await mapearColunasPlanilha({ amostra });
    const colunas = res?.colunas || {};
    if (colunas.nome == null) {
      throw new Error(
        `Não identifiquei a coluna com o nome do aluno em "${file.name}". Confira se a planilha tem uma coluna de nomes.`,
      );
    }
    const temCabecalho = res?.tem_cabecalho !== false;
    const lidos = aplicarMapeamento(todasLinhas, colunas, temCabecalho);
    return { origem: `${file.name}: ${lidos.length} aluno(s) — planilha`, linhas: lidos };
  };

  const processar = async () => {
    if (files.length === 0 || !turmaId) return;
    setLoading(true);
    setError('');
    setProgresso('');
    try {
      const resultados = [];
      for (let i = 0; i < files.length; i++) {
        setProgresso(`Lendo ${i + 1} de ${files.length}: ${files[i].name}`);
        resultados.push(await processarArquivo(files[i]));
      }

      const juntos = juntarSemRepetir(resultados.map((r) => r.linhas));
      if (juntos.length === 0) {
        setError('Não encontrei nenhum aluno nos arquivos enviados. Confira se a lista está legível.');
        return;
      }
      setLinhas(juntos);
      setOrigens(resultados.map((r) => r.origem));
      setStep('review');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Erro ao ler os arquivos.');
    } finally {
      setLoading(false);
      setProgresso('');
    }
  };

  const atualizarLinha = (indice, campo, valor) => {
    setLinhas((prev) =>
      prev.map((r, i) => (i === indice ? { ...r, [campo]: valor, revisar: false } : r)),
    );
  };

  const removerLinha = (indice) => {
    setLinhas((prev) => prev.filter((_, i) => i !== indice));
  };

  const salvarNoBanco = async () => {
    if (!turmaId || linhas.length === 0) return;
    setStep('saving');
    setError('');
    try {
      const seenNome = new Set();
      const linhasUnicas = [];
      for (const row of linhas) {
        if (!row.nome || !row.nome.trim()) continue;
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
        const mat = (row.matricula || '').trim();
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
          nome: row.nome.trim(),
          data_nascimento: normalizarData(row.data_nascimento) || null,
          turma_id: turmaId,
          etiqueta_cor: 'azul',
          matricula: (row.matricula || '').trim() || null,
          responsavel: (row.responsavel || '').trim() || null,
          contato: (row.contato || '').trim() || null,
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

  const totalRevisar = linhas.filter((r) => r.revisar || !r.nome?.trim()).length;

  return (
    <div className="import-panel">
      <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, color: '#374151' }}>
        Importar alunos
      </h3>

      {step === 'upload' && (
        <div>
          <p style={{ marginBottom: 12, color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
            Envie a lista da turma em <strong>foto, PDF, CSV ou Excel</strong> — a leitura é feita
            automaticamente. Pode enviar mais de um arquivo (ex.: duas fotos da mesma lista).
            Quem já estiver na turma será ignorado.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <input type="file" accept={EXTENSOES_ACEITAS} multiple onChange={handleFileChange} />
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '8px 16px', width: 'auto' }}
              disabled={files.length === 0 || loading}
              onClick={processar}
            >
              {loading ? 'Lendo...' : 'Ler lista'}
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
          {progresso && <p style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>{progresso}</p>}
          {error && <p style={{ color: '#b91c1c', marginTop: 10, fontSize: 14 }}>{error}</p>}
        </div>
      )}

      {step === 'review' && (
        <div>
          <p style={{ marginBottom: 4, color: '#15803d', fontWeight: 600 }}>
            {linhas.length} aluno(s) encontrado(s). Confira e corrija antes de cadastrar.
          </p>
          {origens.map((o) => (
            <p key={o} style={{ margin: '0 0 2px', fontSize: 12, color: '#6b7280' }}>{o}</p>
          ))}
          {totalRevisar > 0 && (
            <p style={{ margin: '8px 0', fontSize: 13, color: '#92400e' }}>
              <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }} />
              {totalRevisar} linha(s) destacada(s) — confira antes de salvar.
            </p>
          )}
          {error && <p style={{ color: '#b91c1c', marginBottom: 10 }}>{error}</p>}

          <p className="table-scroll-hint">Toque em qualquer campo para corrigir.</p>
          <div className="import-table-wrap" style={{ maxHeight: 340, marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
              <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Nascimento</th>
                  <th style={thStyle}>Matrícula</th>
                  <th style={thStyle}>Responsável</th>
                  <th style={thStyle}>Contato</th>
                  <th style={{ ...thStyle, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {linhas.map((r, idx) => {
                  const destaque = r.revisar || !r.nome?.trim();
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: destaque ? '#fffbeb' : undefined,
                      }}
                    >
                      <td style={tdStyle}>
                        <input
                          value={r.nome || ''}
                          onChange={(e) => atualizarLinha(idx, 'nome', e.target.value)}
                          style={{ ...inputStyle, minWidth: 160 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={normalizarData(r.data_nascimento) || ''}
                          onChange={(e) => atualizarLinha(idx, 'data_nascimento', e.target.value)}
                          style={{ ...inputStyle, minWidth: 130 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={r.matricula || ''}
                          onChange={(e) => atualizarLinha(idx, 'matricula', e.target.value)}
                          style={{ ...inputStyle, minWidth: 80 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={r.responsavel || ''}
                          onChange={(e) => atualizarLinha(idx, 'responsavel', e.target.value)}
                          style={{ ...inputStyle, minWidth: 140 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={r.contato || ''}
                          onChange={(e) => atualizarLinha(idx, 'contato', e.target.value)}
                          style={{ ...inputStyle, minWidth: 110 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => removerLinha(idx)}
                          title="Remover esta linha"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#dc3545',
                            cursor: 'pointer',
                          }}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="import-actions">
            <button type="button" className="btn-primary" style={{ width: 'auto' }} onClick={salvarNoBanco}>
              Cadastrar na turma
            </button>
            <button
              type="button"
              style={botaoSecundario}
              onClick={() => {
                setStep('upload');
                setLinhas([]);
                setOrigens([]);
                setFiles([]);
              }}
            >
              Voltar
            </button>
            <button
              type="button"
              style={botaoSecundario}
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
            style={{ marginTop: 12, width: 'auto' }}
            onClick={() => {
              setFiles([]);
              setLinhas([]);
              setOrigens([]);
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

/** Normaliza a saída da IA para o formato usado na tela de conferência. */
function normalizarSaidaIa(res) {
  const lista = Array.isArray(res?.alunos) ? res.alunos : [];
  return lista
    .map((a) => ({
      nome: (a?.nome || '').trim(),
      data_nascimento: normalizarData(a?.data_nascimento) || null,
      matricula: a?.matricula ? String(a.matricula).trim() : null,
      responsavel: a?.responsavel ? String(a.responsavel).trim() : null,
      contato: a?.contato ? String(a.contato).trim() : null,
      revisar: a?.revisar === true,
    }))
    .filter((a) => a.nome.length >= 3);
}

const thStyle = { padding: 8, textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' };
const tdStyle = { padding: 4 };
const inputStyle = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
};
const botaoSecundario = {
  padding: '8px 14px',
  border: '1px solid #ddd',
  borderRadius: 8,
  background: 'white',
  cursor: 'pointer',
};

export default ImportarListaAlunos;
