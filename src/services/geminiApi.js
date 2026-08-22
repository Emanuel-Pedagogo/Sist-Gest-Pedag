import { supabase } from '../supabaseClient';

/**
 * Chama Edge Function do Supabase que usa a API Gemini (chave só no servidor).
 */
async function invokeGeminiFunction(functionName, body) {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) {
    const msg = error.message || String(error);
    if (msg.includes('Failed to send') || msg.includes('FunctionsFetchError')) {
      throw new Error(
        'Não foi possível contactar a função no Supabase. Confira se você fez o deploy da Edge Function e o secret GEMINI_API_KEY (veja docs/GEMINI-SETUP.md).',
      );
    }
    throw new Error(msg);
  }
  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error));
  }
  return data;
}

/** Extrai registros de sondagem a partir de foto da ficha. */
export async function extractSondagensFromImage({ imageBase64, mimeType, anoEscolar }) {
  return invokeGeminiFunction('extract-sondagens', {
    imageBase64,
    mimeType: mimeType || 'image/jpeg',
    anoEscolar: anoEscolar || '1-2',
  });
}

/** Extrai notas e faltas de boletim PDF da turma (vários alunos, EducaMais). */
export async function extractBoletinsFromPdf({ pdfBase64, mimeType, modoBoletim, disciplinas }) {
  return invokeGeminiFunction('extract-boletins-pdf', {
    pdfBase64,
    mimeType: mimeType || 'application/pdf',
    modoBoletim: modoBoletim || 'fund2',
    disciplinas: disciplinas || [],
  });
}

/** Extrai a lista de alunos de uma foto ou PDF. */
export async function extractAlunosFromArquivo({ arquivoBase64, mimeType }) {
  return invokeGeminiFunction('extract-alunos', {
    modo: 'extrair',
    arquivoBase64,
    mimeType: mimeType || 'image/jpeg',
  });
}

/**
 * Descobre qual coluna da planilha é cada campo, a partir do cabeçalho e das
 * primeiras linhas. O app aplica o mapeamento nas demais linhas por conta própria.
 */
export async function mapearColunasPlanilha({ amostra }) {
  return invokeGeminiFunction('extract-alunos', { modo: 'mapear', amostra });
}

/** Gera resumo pedagógico em texto a partir dos dados do aluno. */
export async function generateResumoPedagogico(payload) {
  return invokeGeminiFunction('generate-resumo-aluno', payload);
}

/** Converte File de imagem para base64 (sem prefixo data:). */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Falha ao ler arquivo.'));
        return;
      }
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Erro ao ler arquivo.'));
    reader.readAsDataURL(file);
  });
}
