// Cliente mínimo para a API da Anthropic (Claude), usado pela Edge Function chat-ia.
// Chave só existe no servidor (secret ANTHROPIC_API_KEY) — nunca no frontend.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-5';

export type AnthropicRole = 'user' | 'assistant';

export interface AnthropicContentBlock {
  type: string;
  [key: string]: unknown;
}

export interface AnthropicMessage {
  role: AnthropicRole;
  content: string | AnthropicContentBlock[];
}

export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicResponse {
  id: string;
  role: 'assistant';
  content: AnthropicContentBlock[];
  stop_reason: string | null;
  [key: string]: unknown;
}

/** Chama a Messages API da Anthropic. Lança erro se a chave não estiver configurada ou a API responder erro. */
export async function callClaude({
  system,
  messages,
  tools,
  maxTokens = 1536,
}: {
  system: string;
  messages: AnthropicMessage[];
  tools?: AnthropicToolDef[];
  maxTokens?: number;
}): Promise<AnthropicResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY não configurada no Supabase. Veja docs/CHAT-IA-SETUP.md',
    );
  }
  const model = Deno.env.get('ANTHROPIC_MODEL') || DEFAULT_MODEL;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      ...(tools && tools.length ? { tools } : {}),
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || JSON.stringify(json);
    throw new Error(`Claude API: ${msg}`);
  }
  return json as AnthropicResponse;
}
