import React, { useState, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';
import { confirmAction } from './utils/appFeedback';
import { extractSondagensFromImage, fileToBase64 } from './services/geminiApi';
import { pickPhotoAsFile } from './utils/nativeCamera';
import {
  inferAnoEscolarSet,
  getOpcoesPorAnoSet,
  matchNivelOficial,
} from './utils/sondagemNiveis';
import {
  buildSondagemImportKey,
  getSondagemPersistenceAction,
  normalizeExtractedSondagens,
} from './utils/sondagemImport';

function normalizarNome(n) {
  return String(n || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizarMatricula(m) {
  return String(m || '').trim().replace(/^0+/, '') || '';
}

/**
 * Importa sondagens a partir de foto da ficha (Gemini via Edge Function).
 */
function ImportarSondagemFoto({
  turmaId,
  turma,
  students = [],
  onImportComplete,
  reavaliarCorAluno,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload');
  const [linhas, setLinhas] = useState([]);
  const [sobrescreverExistentes, setSobrescreverExistentes] = useState(false);
  const [resumoImport, setResumoImport] = useState({ inseridos: 0, atualizados: 0, ignorados: 0, erros: [] });

  const anoSet = useMemo(() => inferAnoEscolarSet(turma), [turma]);
  const { leitura: opcoesLeitura, escrita: opcoesEscrita } = useMemo(
    () => getOpcoesPorAnoSet(anoSet),
    [anoSet],
  );

  const alunosPorNome = useMemo(() => {
    const map = new Map();
    (students || []).forEach((a) => {
      map.set(normalizarNome(a.nome), a);
    });
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

  const alunosPorId = useMemo(() => {
    const map = new Map();
    (students || []).forEach((a) => {
      map.set(a.id, a);
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
    if (selected && selected.type.startsWith('image/')) {
      setFile(selected);
      setError('');
    } else {
      setFile(null);
      setError('Selecione uma imagem (JPG, PNG ou WEBP).');
    }
  };

  const handleNativePhoto = async () => {
    setError('');
    try {
      const photoFile = await pickPhotoAsFile('sondagem');
      setFile(photoFile);
    } catch (err) {
      if (err?.message !== 'User cancelled photos app') {
        setError(err?.message || 'Não foi possível obter a foto.');
      }
    }
  };

  const processarImagem = async () => {
    if (!file || !turmaId) return;
    setLoading(true);
    setError('');
    try {
      const base64 = await fileToBase64(file);
      const data = await extractSondagensFromImage({
        imageBase64: base64,
        mimeType: file.type,
        anoEscolar: anoSet,
      });

      const registros = normalizeExtractedSondagens(data?.registros || []);
      if (registros.length === 0) {
        setError('Nenhum aluno encontrado na imagem. Tente outra foto com melhor iluminação.');
        setLoading(false);
        return;
      }

      const mapped = registros.map((r, idx) => {
        const nivelLeitura = matchNivelOficial(r.nivel_leitura, opcoesLeitura) || r.nivel_leitura || '';
        const nivelEscrita = matchNivelOficial(r.nivel_escrita, opcoesEscrita) || r.nivel_escrita || '';
        const row = {
          id: `row-${r.ordem_original ?? idx}`,
          ordem_ficha: r.ordem_ficha ?? idx + 1,
          nome_completo: r.nome_completo || '',
          matricula: r.matricula || '',
          data_sondagem: r.data_sondagem || data?.data_referencia || '',
          nivel_leitura: nivelLeitura,
          nivel_escrita: nivelEscrita,
          observacoes: r.observacoes || '',
          confianca: r.confianca || 'media',
          duvidas: r.duvidas || [],
          aluno_id: null,
        };
        const aluno = vincularAluno(row);
        if (aluno) row.aluno_id = aluno.id;
        return row;
      });

      setLinhas(mapped);
      setStep('review');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Erro ao processar imagem.');
    } finally {
      setLoading(false);
    }
  };

  const updateLinha = (id, field, value) => {
    setLinhas((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === 'nome_completo' || field === 'matricula') {
          const aluno = vincularAluno(updated);
          updated.aluno_id = aluno?.id || null;
        }
        return updated;
      }),
    );
  };

  const salvarNoBanco = async () => {
    if (!turmaId || linhas.length === 0) return;
    if (
      sobrescreverExistentes &&
      !(await confirmAction({
        message: 'As sondagens existentes para os mesmos alunos e datas serão atualizadas. Deseja continuar?',
        confirmLabel: 'Atualizar',
      }))
    ) {
      return;
    }

    setStep('saving');
    setError('');
    try {
      const erros = [];
      let inseridos = 0;
      let atualizados = 0;
      let ignorados = 0;
      const alunosReavaliar = new Set();
      const linhasValidas = [];

      for (const row of linhas) {
        if (!row.aluno_id) {
          ignorados += 1;
          erros.push(`${row.nome_completo || 'Sem nome'}: aluno nao encontrado na turma.`);
          continue;
        }
        if (!row.nivel_leitura || !row.nivel_escrita) {
          ignorados += 1;
          erros.push(`${row.nome_completo}: niveis de leitura/escrita incompletos.`);
          continue;
        }
        if (!row.data_sondagem) {
          ignorados += 1;
          erros.push(`${row.nome_completo}: data da sondagem obrigatoria.`);
          continue;
        }
        linhasValidas.push(row);
      }

      const alunoIds = [...new Set(linhasValidas.map((row) => row.aluno_id))];
      const datas = [...new Set(linhasValidas.map((row) => row.data_sondagem))];
      let existingKeys = new Set();

      if (alunoIds.length > 0 && datas.length > 0) {
        const { data: existingRows, error: existingError } = await supabase
          .from('sondagens')
          .select('aluno_id, data')
          .in('aluno_id', alunoIds)
          .in('data', datas);

        if (existingError) {
          throw new Error(`Nao foi possivel verificar sondagens existentes: ${existingError.message}`);
        }

        existingKeys = new Set(
          (existingRows || []).map((registro) => buildSondagemImportKey(registro.aluno_id, registro.data)),
        );
      }

      for (const row of linhasValidas) {
        const action = getSondagemPersistenceAction({
          alunoId: row.aluno_id,
          dataSondagem: row.data_sondagem,
          overwriteExisting: sobrescreverExistentes,
          existingKeys,
        });

        if (action === 'skip-existing') {
          ignorados += 1;
          erros.push(
            `${row.nome_completo}: ja existe sondagem nessa data para este aluno. Marque a opcao de sobrescrever para atualizar.`,
          );
          continue;
        }

        const payload = {
          aluno_id: row.aluno_id,
          data: row.data_sondagem,
          nivel_leitura: row.nivel_leitura,
          nivel_escrita: row.nivel_escrita,
          observacoes: row.observacoes?.trim() || null,
        };

        const { error: persistError } =
          action === 'update'
            ? await supabase.from('sondagens').update(payload).eq('aluno_id', row.aluno_id).eq('data', row.data_sondagem)
            : await supabase.from('sondagens').insert([payload]);

        if (persistError) {
          ignorados += 1;
          erros.push(`${row.nome_completo}: ${persistError.message}`);
          continue;
        }

        existingKeys.add(buildSondagemImportKey(row.aluno_id, row.data_sondagem));
        alunosReavaliar.add(row.aluno_id);
        if (action === 'update') {
          atualizados += 1;
        } else {
          inseridos += 1;
        }
      }

      if (reavaliarCorAluno) {
        for (const alunoId of alunosReavaliar) {
          await reavaliarCorAluno(alunoId);
        }
      }

      setResumoImport({ inseridos, atualizados, ignorados, erros });
      setStep('success');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Erro ao salvar sondagens.');
      setStep('review');
    }
  };

  return (
    <div className="import-panel">
      <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 17, color: '#374151' }}>
        <i className="fas fa-camera" style={{ marginRight: 8, color: '#7c3aed' }} />
        Importar sondagens por foto (IA)
      </h3>

      {step === 'upload' && (
        <div>
          <p style={{ marginBottom: 12, color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
            Envie uma <strong>foto da ficha de sondagem</strong> da turma. A IA (Gemini) extrai nome, níveis de
            leitura/escrita e data. Você revisa antes de salvar. Etapa detectada para níveis:{' '}
            <strong>{anoSet === '1-2' ? '1º–2º ano' : anoSet === '3-5' ? '3º–5º ano' : '6º–9º ano'}</strong>.
          </p>
          <div className="import-actions">
            {Capacitor.isNativePlatform() && (
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '8px 16px', background: '#2563eb' }}
                disabled={loading}
                onClick={handleNativePhoto}
              >
                <i className="fas fa-camera" style={{ marginRight: 6 }} />
                Câmera / Galeria
              </button>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={handleFileChange} />
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '8px 16px', background: '#7c3aed' }}
              disabled={!file || loading}
              onClick={processarImagem}
            >
              {loading ? 'Analisando foto...' : 'Extrair com IA'}
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
            {linhas.length} registro(s) extraido(s). Confira na mesma ordem da ficha antes de salvar.
          </p>
          <p style={{ marginTop: 0, marginBottom: 12, color: '#4b5563', fontSize: 13 }}>
            A numeracao abaixo segue a ordem original da ficha. Ajuste o vinculo do aluno, niveis e data antes de
            confirmar.
          </p>
          {error && <p style={{ color: '#b91c1c', marginBottom: 10 }}>{error}</p>}
          <div className="import-table-wrap" style={{ maxHeight: 360, marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: 8, textAlign: 'left' }}>Linha</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Nome lido pela IA</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Aluno vinculado na turma</th>
                  <th style={{ padding: 8 }}>Data</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Leitura</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Escrita</th>
                  <th style={{ padding: 8 }}>Conf.</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: row.aluno_id ? 'white' : '#fff7ed',
                    }}
                  >
                    <td style={{ padding: 6, whiteSpace: 'nowrap', fontWeight: 700, color: '#374151' }}>
                      {row.ordem_ficha}.
                    </td>
                    <td style={{ padding: 6, minWidth: 170 }}>
                      <input
                        value={row.nome_completo}
                        onChange={(e) => updateLinha(row.id, 'nome_completo', e.target.value)}
                        style={{ width: '100%', fontSize: 11, padding: 4 }}
                      />
                      <div style={{ marginTop: 4, fontSize: 10, color: '#6b7280' }}>
                        {row.matricula ? `Matricula lida: ${row.matricula}` : 'Matricula nao identificada'}
                      </div>
                    </td>
                    <td style={{ padding: 6, minWidth: 180 }}>
                      <select
                        value={row.aluno_id || ''}
                        onChange={(e) => updateLinha(row.id, 'aluno_id', e.target.value || null)}
                        style={{ width: '100%', fontSize: 11, padding: 4 }}
                      >
                        <option value="">— Não vinculado —</option>
                        {students.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome}
                            {a.matricula ? ` (${a.matricula})` : ''}
                          </option>
                        ))}
                      </select>
                      <div style={{ marginTop: 4, fontSize: 10, color: row.aluno_id ? '#166534' : '#b45309' }}>
                        {row.aluno_id
                          ? `Vinculado: ${alunosPorId.get(row.aluno_id)?.nome || 'Aluno selecionado'}`
                          : 'Sem vinculo com aluno da turma'}
                      </div>
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        type="date"
                        value={row.data_sondagem || ''}
                        onChange={(e) => updateLinha(row.id, 'data_sondagem', e.target.value)}
                        style={{ fontSize: 11, padding: 4 }}
                      />
                    </td>
                    <td style={{ padding: 6, minWidth: 120 }}>
                      <select
                        value={row.nivel_leitura}
                        onChange={(e) => updateLinha(row.id, 'nivel_leitura', e.target.value)}
                        style={{ width: '100%', fontSize: 10, padding: 4 }}
                      >
                        <option value="">—</option>
                        {opcoesLeitura.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: 6, minWidth: 120 }}>
                      <select
                        value={row.nivel_escrita}
                        onChange={(e) => updateLinha(row.id, 'nivel_escrita', e.target.value)}
                        style={{ width: '100%', fontSize: 10, padding: 4 }}
                      >
                        <option value="">—</option>
                        {opcoesEscrita.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: 6, fontSize: 10, color: row.confianca === 'baixa' ? '#b91c1c' : '#666' }}>
                      {row.confianca}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: 10,
              fontSize: 13,
              color: '#374151',
            }}
          >
            <input
              type="checkbox"
              checked={sobrescreverExistentes}
              onChange={(e) => setSobrescreverExistentes(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>Sobrescrever sondagens ja cadastradas para o mesmo aluno e data</span>
          </label>
          {sobrescreverExistentes && (
            <p
              style={{
                marginTop: 0,
                marginBottom: 14,
                padding: 10,
                borderRadius: 8,
                background: '#fff7ed',
                color: '#9a3412',
                fontSize: 12,
              }}
            >
              As sondagens existentes para os mesmos alunos e datas serao atualizadas.
            </p>
          )}
          <div className="import-actions">
            <button type="button" className="btn-primary" style={{ padding: '8px 16px' }} onClick={salvarNoBanco}>
              Cadastrar sondagens
            </button>
            <button
              type="button"
              style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: 8, background: 'white' }}
              onClick={() => {
                setStep('upload');
                setLinhas([]);
                setSobrescreverExistentes(false);
              }}
            >
              Nova foto
            </button>
          </div>
        </div>
      )}

      {step === 'saving' && (
        <p style={{ color: '#6b7280' }}>Salvando sondagens...</p>
      )}

      {step === 'success' && (
        <div>
          <p style={{ color: '#15803d', fontWeight: 600, marginBottom: 8 }}>
            Concluido: {resumoImport.inseridos} criada(s), {resumoImport.atualizados} atualizada(s)
            {resumoImport.ignorados > 0 && ` e ${resumoImport.ignorados} ignorada(s).`}
            {resumoImport.ignorados === 0 && '.'}
          </p>
          {resumoImport.erros.length > 0 && (
            <ul style={{ fontSize: 13, color: '#b45309', marginBottom: 12 }}>
              {resumoImport.erros.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '8px 16px' }}
            onClick={() => onImportComplete && onImportComplete()}
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

export default ImportarSondagemFoto;
