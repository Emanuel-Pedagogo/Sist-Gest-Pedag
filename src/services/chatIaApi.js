import { supabase } from '../supabaseClient';

/**
 * Chama a Edge Function chat-ia (Claude API, chave só no servidor).
 * Repassa o token do usuário logado — as RPCs do banco respeitam a RLS
 * normalmente (nada roda com privilégio de service role).
 */
async function invokeChatIaFunction(body) {
  const { data, error } = await supabase.functions.invoke('chat-ia', { body });
  if (error) {
    const msg = error.message || String(error);
    if (msg.includes('Failed to send') || msg.includes('FunctionsFetchError')) {
      throw new Error(
        'Não foi possível contactar o Chat IA no Supabase. Confira se a Edge Function "chat-ia" foi implantada e o secret ANTHROPIC_API_KEY (veja docs/CHAT-IA-SETUP.md).',
      );
    }
    throw new Error(msg);
  }
  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error));
  }
  return data;
}

/**
 * Envia o histórico de mensagens (formato Anthropic: [{ role, content }])
 * e recebe { reply, messages, pendingConfirmations }.
 * `escolaId` é a escola selecionada no topo da tela — o chat só consulta/altera
 * dados dessa escola (a Edge Function reforça esse filtro no servidor).
 */
export async function sendChatMessage(messages, escolaId) {
  return invokeChatIaFunction({ messages, escolaId: escolaId || null });
}

/** Confirma e executa uma alteração (INSERT/UPDATE/DELETE) proposta pelo chat. */
export async function confirmarEscritaChatIa(confirmacaoId) {
  return invokeChatIaFunction({ confirmarEscritaId: confirmacaoId });
}

/** Cancela uma alteração proposta pelo chat (não executa nada). */
export async function cancelarEscritaChatIa(confirmacaoId) {
  return invokeChatIaFunction({ cancelarEscritaId: confirmacaoId });
}

/** Monta um bloco de mensagem de usuário simples (texto puro) no formato Anthropic. */
export function userTextMessage(text) {
  return { role: 'user', content: text };
}
