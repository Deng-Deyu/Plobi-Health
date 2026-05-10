import OpenAI from 'openai';

function getArk() {
  const apiKey = process.env.ARK_API_KEY;
  const baseURL = process.env.ARK_BASE_URL;
  
  if (!apiKey) {
    throw new Error(
      'Missing ARK_API_KEY. Please set the environment variable.'
    );
  }
  
  return new OpenAI({
    apiKey,
    baseURL: baseURL || 'https://ark.cn-beijing.volces.com/api/v3',
  });
}

export async function chat(messages: any[], opts: { json?: boolean; tools?: any[] } = {}) {
  const ark = getArk();
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
  // doubao-embedding 单次限制最多 10 条
  const BATCH = 10;
  const ark = getArk();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const res = await ark.embeddings.create({
      model: process.env.ARK_EMBED_MODEL!,
      input: slice,
    });
    out.push(...res.data.map((d: any) => d.embedding as number[]));
  }
  return out;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
