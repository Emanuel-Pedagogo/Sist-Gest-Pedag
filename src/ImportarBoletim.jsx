import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabaseClient';

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const DISCIPLINAS_ATE_5_ANO = [
  'LINGUA PORTUGUESA',
  'ENSINO DA HISTÓRIA E GEOGRAFIA',
  'CIÊNCIAS',
  'MATEMÁTICA',
  'ENSINO RELIGIOSO',
  'EDUCAÇÃO FÍSICA',
  'ENSINO DA ARTE',
];

const DISCIPLINAS_6_AO_9_ANO = [
  'LINGUA PORTUGUESA',
  'HISTÓRIA',
  'GEOGRAFIA',
  'CIÊNCIAS',
  'MATEMÁTICA',
  'ENSINO RELIGIOSO',
  'EDUCAÇÃO FÍSICA',
  'ENSINO DA ARTE',
  'LÍNGUA ESTRANGEIRA - INGLÊS',
  'ESTUDOS AMAZÔNICOS',
];

const CONCEITO_TO_NUM = { 'N': 1, 'EP': 2, 'S': 3 };

function normalizeNome(s) {
  if (!s || typeof s !== 'string') return '';
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Importação em lote: passe `turmaId`. Um aluno: passe `alunoAlvoId`, `alunoMatricula` e/ou `alunoNome`. */
function ImportarBoletim({
  turmaId,
  alunoAlvoId,
  alunoMatricula,
  alunoNome,
  onImportComplete,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alunosExtraidos, setAlunosExtraidos] = useState([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload'); // 'upload', 'review', 'saving'

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Por favor, selecione um arquivo PDF válido.');
    }
  };

  const processPDF = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      // 1. Ler o arquivo como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // 2. Carregar o documento PDF
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let textoCompleto = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const pagina = await pdf.getPage(i);
        const conteudo = await pagina.getTextContent();
        const textoPagina = conteudo.items.map(item => item.str).join(' ');
        textoCompleto += textoPagina + '\n';
      }

      const blocosAlunos = textoCompleto.split('PREFEITURA MUNICIPAL DE SANTARÉM BOLETIM ESCOLAR').filter(bloco => bloco.trim() !== '');
      const extraidos = [];

      for (let bloco of blocosAlunos) {
        const aluno = {
          nome: '',
          matricula: '',
          anoEscolar: '',
          turma: '',
          notas: {},
          faltas: {}
        };

        const matchNome = bloco.match(/NOME:\s*(.*?)\s*MATRÍCULA:\s*(\d+)/);
        if (matchNome) {
          aluno.nome = matchNome[1].trim();
          aluno.matricula = matchNome[2].trim();
        } else {
          // Tenta um padrão alternativo caso a quebra de linha esteja diferente
          const matchNomeAlt = bloco.match(/NOME:\s*(.*?)\n.*?MATRÍCULA:\s*(\d+)/);
          if (matchNomeAlt) {
            aluno.nome = matchNomeAlt[1].trim();
            aluno.matricula = matchNomeAlt[2].trim();
          } else {
            continue; // Pula se não achou nome/matrícula
          }
        }

        const matchTurma = bloco.match(/ANO ESCOLAR:\s*(.*?)\s*TURMA:\s*(.*?)(?:\n|$)/);
        if (matchTurma) {
          aluno.anoEscolar = matchTurma[1].trim();
          aluno.turma = matchTurma[2].trim();
        }

        // Extrair notas
        const isFund2 = /[6-9]º|[6-9]o|[6-9]°|sexto|sétimo|oitavo|nono/i.test(aluno.anoEscolar);
        const disciplinasAtuais = isFund2 ? DISCIPLINAS_6_AO_9_ANO : DISCIPLINAS_ATE_5_ANO;

        disciplinasAtuais.forEach(disciplina => {
          // Precisamos escapar caracteres especiais na disciplina para o Regex funcionar
          const escapedDisciplina = disciplina.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Procura a disciplina seguida de tokens válidos de nota/falta
          // Tokens válidos: números (ex: 7,5 ou 0), hífens (-), X, ou conceitos (EP, S, N)
          const tokenPattern = /(?:\b\d+(?:[.,]\d+)?\b|-|\bX\b|\bEP\b|\bS\b|\bN\b)/.source;
          const regexDisciplina = new RegExp(`${escapedDisciplina}\\s+((?:${tokenPattern}\\s*)+)`);
          const match = bloco.match(regexDisciplina);
          
          if (match) {
            // Limpa os espaços extras e divide os valores
            const valoresStr = match[1].trim();
            // Pega apenas os tokens válidos (números, conceitos, hifens, X)
            const tokens = valoresStr.split(/\s+/).filter(t => t !== '');
            
            aluno.notas[disciplina] = tokens;
          }
        });

        // Extrair faltas (última linha de números antes da assinatura ou legenda)
        // Procura a linha de faltas: 1º Bim 2º Bim 3º Bim 4º Bim Total de faltas (dias) Abonadas Total Geral Frequência
        // e pega a linha seguinte que contém os números
        const regexFaltas = /Total Geral Frequência\s*\n?\s*([\d\s]+)\s*\d+(?:[.,]\d+)?%/;
        const matchFaltas = bloco.match(regexFaltas);
        if (matchFaltas) {
           const numerosFaltas = matchFaltas[1].trim().split(/\s+/);
           if(numerosFaltas.length >= 4) {
               aluno.faltas = {
                   1: numerosFaltas[0],
                   2: numerosFaltas[1],
                   3: numerosFaltas[2],
                   4: numerosFaltas[3]
               }
           }
        }

        extraidos.push(aluno);
      }

      let lista = extraidos;
      if (alunoAlvoId) {
        const matNorm = alunoMatricula != null && String(alunoMatricula).trim() !== '' ? String(alunoMatricula).trim() : '';
        const nomeNorm = normalizeNome(alunoNome || '');
        lista = extraidos.filter((a) => {
          const pdfMat = String(a.matricula || '').trim();
          if (matNorm && pdfMat === matNorm) return true;
          if (nomeNorm && normalizeNome(a.nome || '') === nomeNorm) return true;
          return false;
        });
        if (lista.length === 0) {
          setError(
            'Nenhum trecho do PDF corresponde a este aluno. Verifique se o PDF é o boletim individual dele e se matrícula/nome batem com o cadastro.',
          );
          setLoading(false);
          return;
        }
      }

      setAlunosExtraidos(lista);
      setStep('review');
    } catch (err) {
      console.error('Erro ao processar PDF:', err);
      setError(`Erro ao ler o arquivo PDF: ${err.message || 'Verifique se o formato está correto.'}`);
    } finally {
      setLoading(false);
    }
  };

  const saveToDatabase = async () => {
    setStep('saving');
    try {
      let alunosTurma = [];
      if (!alunoAlvoId) {
        if (!turmaId) throw new Error('turmaId é obrigatório para importação em lote.');
        const { data, error: errAlunos } = await supabase
          .from('alunos')
          .select('id, nome, matricula')
          .eq('turma_id', turmaId);

        if (errAlunos) throw errAlunos;
        alunosTurma = data || [];
      }

      const notasParaSalvar = [];

      for (const alunoExtraido of alunosExtraidos) {
        let alunoDb = null;
        if (alunoAlvoId) {
          const matNorm = alunoMatricula != null && String(alunoMatricula).trim() !== '' ? String(alunoMatricula).trim() : '';
          const nomeNorm = normalizeNome(alunoNome || '');
          const pdfMat = String(alunoExtraido.matricula || '').trim();
          const nomePdfNorm = normalizeNome(alunoExtraido.nome || '');
          const ok =
            (matNorm && pdfMat === matNorm) ||
            (nomeNorm && nomePdfNorm === nomeNorm);
          if (!ok) continue;
          alunoDb = { id: alunoAlvoId };
        } else {
          alunoDb = alunosTurma.find(
            (a) =>
              String(a.matricula || '').trim() === String(alunoExtraido.matricula || '').trim() ||
              String(a.nome || '').toLowerCase().trim() === String(alunoExtraido.nome || '').toLowerCase().trim(),
          );
        }

        if (!alunoDb) {
          console.warn(`Aluno não encontrado no banco: ${alunoExtraido.nome} (${alunoExtraido.matricula})`);
          continue;
        }

        const isPrimeiroAno = /1º|1o|1°|primeiro/i.test(alunoExtraido.anoEscolar);
        const isFund2 = /[6-9]º|[6-9]o|[6-9]°|sexto|sétimo|oitavo|nono/i.test(alunoExtraido.anoEscolar);
        const disciplinasAtuais = isFund2 ? DISCIPLINAS_6_AO_9_ANO : DISCIPLINAS_ATE_5_ANO;

        // Processar notas
        for (const disciplina of disciplinasAtuais) {
          const tokens = alunoExtraido.notas[disciplina];
          if (!tokens) continue;

          // A estrutura dos tokens varia.
          // Para 1º ano (Conceitos): C C C C CF -> ex: EP N (significa 1º bim EP, 2º bim N)
          // Para 3º/4º/5º ano: NT NT RS1 NT NT RS2 MD -> ex: 7,5 1,5 (significa 1º bim 7,5, 2º bim 1,5)
          // Precisamos mapear os tokens para os bimestres.
          
          let b1 = null, b2 = null, b3 = null, b4 = null;

          if (isPrimeiroAno) {
             // Conceitos: os 4 primeiros tokens são os bimestres
             if (tokens[0] && tokens[0] !== '-') b1 = CONCEITO_TO_NUM[tokens[0]] || null;
             if (tokens[1] && tokens[1] !== '-') b2 = CONCEITO_TO_NUM[tokens[1]] || null;
             if (tokens[2] && tokens[2] !== '-') b3 = CONCEITO_TO_NUM[tokens[2]] || null;
             if (tokens[3] && tokens[3] !== '-') b4 = CONCEITO_TO_NUM[tokens[3]] || null;
          } else {
             // Notas numéricas: NT FA NT FA RS1 NT FA NT FA RS2 MD TF
             // Precisamos converter vírgula para ponto
             const parseNota = (val) => {
                 if (!val || val === '-' || val === 'X') return null;
                 const num = parseFloat(val.replace(',', '.'));
                 return isNaN(num) ? null : num;
             };

             // O padrão do EducaMais para o Fund II é:
             // [Nota B1] [Falta B1] [Nota B2] [Falta B2] [RS1] [Nota B3] [Falta B3] [Nota B4] [Falta B4] [RS2] [MD] [TF]
             // Mas se o bimestre ainda não aconteceu, ele não coloca nada.
             // Exemplo do Bruno (1º Bimestre apenas):
             // LINGUA PORTUGUESA 8,5 0 0 0 0 1,7 0
             // Isso significa: Nota B1=8,5 | Falta B1=0 | Nota B2=0 | Falta B2=0 | RS1=0 | MD=1,7 | TF=0
             // Perceba que o EducaMais preenche com ZEROS as notas futuras e hífens/zeros para as faltas.
             
             // Para resolver isso de forma robusta, vamos pegar APENAS os números que têm vírgula,
             // pois as notas do EducaMais SEMPRE têm vírgula (ex: 8,0 ou 0,0), e as faltas são inteiros.
             
             const notasComVirgula = tokens.filter(t => t.includes(','));
             
             // Agora, notasComVirgula tem apenas as notas reais e a média final.
             // Ex: ["8,5", "1,7"] -> Onde 8,5 é B1 e 1,7 é a Média (MD).
             
             // Removemos a última nota, que é sempre a Média Final (MD)
             if (notasComVirgula.length > 0) {
                 notasComVirgula.pop();
             }
             
             // O que sobrar são os bimestres na ordem: B1, B2, B3, B4
             const notasNumericas = notasComVirgula.map(parseNota);

             if (notasNumericas[0] !== undefined && notasNumericas[0] !== 0) b1 = notasNumericas[0];
             if (notasNumericas[1] !== undefined && notasNumericas[1] !== 0) b2 = notasNumericas[1];
             if (notasNumericas[2] !== undefined && notasNumericas[2] !== 0) b3 = notasNumericas[2];
             if (notasNumericas[3] !== undefined && notasNumericas[3] !== 0) b4 = notasNumericas[3];
          }

          // Prepara os objetos para upsert
          if (b1 !== null) notasParaSalvar.push({ aluno_id: alunoDb.id, disciplina, bimestre: 1, nota: b1 });
          if (b2 !== null) notasParaSalvar.push({ aluno_id: alunoDb.id, disciplina, bimestre: 2, nota: b2 });
          if (b3 !== null) notasParaSalvar.push({ aluno_id: alunoDb.id, disciplina, bimestre: 3, nota: b3 });
          if (b4 !== null) notasParaSalvar.push({ aluno_id: alunoDb.id, disciplina, bimestre: 4, nota: b4 });
        }

        // Processar faltas
        if (alunoExtraido.faltas) {
            for(let bim = 1; bim <= 4; bim++) {
                const faltaStr = alunoExtraido.faltas[bim];
                if(faltaStr && faltaStr !== '0') {
                    const faltaNum = parseInt(faltaStr, 10);
                    if(!isNaN(faltaNum)) {
                        notasParaSalvar.push({
                            aluno_id: alunoDb.id,
                            disciplina: 'Faltas do Bimestre',
                            bimestre: bim,
                            falta: faltaNum
                        });
                    }
                }
            }
        }
      }

      if (notasParaSalvar.length > 0) {
        const { error: errUpsert } = await supabase
          .from('notas_boletim')
          .upsert(notasParaSalvar, { onConflict: 'aluno_id,disciplina,bimestre' });
        
        if (errUpsert) throw errUpsert;
      }

      setStep('success');
      if (onImportComplete) onImportComplete();

    } catch (err) {
      console.error('Erro ao salvar no banco:', err);
      setError('Erro ao salvar as notas no banco de dados.');
      setStep('review');
    }
  };

  return (
    <div className="import-panel">
      <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, color: '#374151' }}>
        <i className="fas fa-file-pdf" style={{ color: '#ef4444', marginRight: 8 }}></i>
        Importar Boletim do EducaMais
      </h3>

      {step === 'upload' && (
        <div>
          <p style={{ marginBottom: 16, color: '#6b7280', fontSize: 14 }}>
            {alunoAlvoId
              ? 'Selecione o PDF do boletim individual deste aluno (EducaMais). As notas serão aplicadas só a ele.'
              : 'Selecione o arquivo PDF gerado pelo sistema EducaMais para extrair as notas automaticamente.'}
          </p>
          <div className="import-actions">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange}
              style={{
                padding: '8px 12px',
                border: '1px dashed #d1d5db',
                borderRadius: 6,
                background: '#f9fafb'
              }}
            />
            <button
              onClick={processPDF}
              disabled={!file || loading}
              style={{
                padding: '8px 16px',
                background: !file || loading ? '#9ca3af' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: !file || loading ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              {loading ? 'Processando...' : 'Extrair Dados'}
            </button>
          </div>
          {error && <p style={{ color: '#dc2626', marginTop: 10, fontSize: 14 }}>{error}</p>}
        </div>
      )}

      {step === 'review' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, color: '#15803d', fontWeight: 500 }}>
              <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
              {alunoAlvoId
                ? 'Dados extraídos para este aluno.'
                : `${alunosExtraidos.length} aluno(s) encontrado(s) no PDF.`}
            </p>
            <div className="import-actions">
              <button
                onClick={() => setStep('upload')}
                style={{
                  padding: '6px 12px',
                  background: '#fff',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={saveToDatabase}
                style={{
                  padding: '6px 12px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Confirmar e Salvar no Banco
              </button>
            </div>
          </div>

          {error && <p style={{ color: '#dc2626', marginBottom: 16, fontSize: 14 }}>{error}</p>}

          <div className="import-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', width: '30%' }}>Aluno</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', width: '20%' }}>Turma (PDF)</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', width: '50%' }}>Pré-visualização da Extração (Bimestres)</th>
                </tr>
              </thead>
              <tbody>
                {alunosExtraidos.map((aluno, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <strong>{aluno.nome}</strong><br/>
                      <span style={{ color: '#6b7280', fontSize: 11 }}>Mat: {aluno.matricula}</span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>{aluno.anoEscolar} - {aluno.turma}</td>
                    <td style={{ padding: '8px 12px', color: '#4b5563' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {Object.entries(aluno.notas).map(([disc, tokens]) => {
                          // Tenta mostrar de forma mais amigável o que foi extraído
                          const isConceito = /1º|1o|1°|primeiro/i.test(aluno.anoEscolar);
                          let notasFormatadas = '';
                          
                          if (isConceito) {
                            notasFormatadas = tokens.slice(0, 4).filter(t => t !== '-').join(' | ');
                          } else {
                            const notasComVirgula = tokens.filter(t => t.includes(','));
                            if (notasComVirgula.length > 0) notasComVirgula.pop(); // Remove MD
                            notasFormatadas = notasComVirgula.join(' | ');
                          }

                          return (
                            <div key={disc} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 500 }}>{disc}:</span>
                              <span style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>
                                {notasFormatadas || '-'}
                              </span>
                            </div>
                          );
                        })}
                        {aluno.faltas && Object.keys(aluno.faltas).length > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTop: '1px solid #e5e7eb' }}>
                            <span style={{ fontSize: 11, fontWeight: 500, color: '#dc2626' }}>Faltas Totais:</span>
                            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                              {Object.values(aluno.faltas).filter(f => f !== '0').join(' | ') || '0'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'saving' && (
        <div style={{ textAlign: 'center', padding: 20, color: '#4b5563' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 10, color: '#2563eb' }}></i>
          <p>Salvando notas no banco de dados...</p>
        </div>
      )}

      {step === 'success' && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <i className="fas fa-check-circle" style={{ fontSize: 32, color: '#16a34a', marginBottom: 10 }}></i>
          <h4 style={{ margin: '0 0 8px 0', color: '#15803d' }}>Importação Concluída!</h4>
          <p style={{ color: '#4b5563', marginBottom: 16 }}>As notas foram salvas com sucesso no banco de dados.</p>
          <button
            onClick={() => {
              setFile(null);
              setAlunosExtraidos([]);
              setStep('upload');
            }}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Importar outro arquivo
          </button>
        </div>
      )}
    </div>
  );
}

export default ImportarBoletim;
