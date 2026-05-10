import { NextResponse } from 'next/server';
import { chat } from '@/lib/doubao';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function GET() {
  const env = {
    hasKey: !!process.env.ARK_API_KEY && process.env.ARK_API_KEY !== 'placeholder',
    baseUrl: process.env.ARK_BASE_URL,
    chatModel: process.env.ARK_CHAT_MODEL,
    embedModel: process.env.ARK_EMBED_MODEL,
  };

  if (!env.hasKey) {
    return NextResponse.json({
      ok: true,
      status: 'env_ready',
      note: 'ARK_API_KEY is placeholder; skipped live test.',
      env,
    });
  }

  try {
    const msg = await chat([{ role: 'user', content: 'Say "ok" only.' }]);
    return NextResponse.json({
      ok: true,
      status: 'live',
      doubao: msg.content,
      env,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message, env },
      { status: 500 }
    );
  }
}
