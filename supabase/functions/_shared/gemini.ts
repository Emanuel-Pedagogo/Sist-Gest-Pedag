const GEMINI_MODEL = 'gemini-2.5-flash';

export async function callGeminiJson(parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no Supabase. Veja docs/GEMINI-SETUP.md');
  }

  const geminiParts = parts.map((p) => {
    if (p.inlineData) {
      return {
        inline_data: {
          mime_type: p.inlineData.mimeType,
          data: p.inlineData.data,
        },
      };
    }
    return { text: p.text || '' };
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: geminiParts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || JSON.stringify(json);
    throw new Error(`Gemini API: ${msg}`);
  }

  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Resposta vazia do Gemini.');
  }

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Não foi possível interpretar JSON retornado pelo Gemini.');
  }
}
