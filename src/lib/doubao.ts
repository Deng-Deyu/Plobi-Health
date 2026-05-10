import OpenAI from 'openai';

export const ark = new OpenAI({
  apiKey: process.env.ARK_API_KEY!,
  baseURL: process.env.ARK_BASE_URL,
});

export async function chat(messages: any[], opts: { json?: boolean; tools?: any[] } = {}) {
  const res = await ark.chat.completions.create({
    model: process.env.ARK_CHAT_MODEL!,
    messages,
    response_format: opts.json ? { type: 'json_object' } : undefined,
    tools: opts.tools,
    temperature: 0.3,
  });
  return res.choices[0].message;
}

export async function batchEmbed(texts: string[]): Promise<number[][]> {
  const BATCH = 64;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const res = await ark.embeddings.create({
      model: process.env.ARK_EMBED_MODEL!,
      input: slice,
    });
    out.push(...res.data.map(d => d.embedding as number[]));
  }
  return out;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
