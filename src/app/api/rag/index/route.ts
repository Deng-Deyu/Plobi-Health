import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Textbook } from "@/lib/types";
import { chunkTextbook } from "@/lib/chunk";
import { batchEmbed } from "@/lib/doubao";
import { saveVectors, type VectorEntry } from "@/lib/rag";

export const maxDuration = 60;
export const runtime = "nodejs";

const TB_PATH = path.join(process.cwd(), "tmp", "textbooks.json");

function readTextbooks(): Textbook[] {
  if (!fs.existsSync(TB_PATH)) return [];
  return JSON.parse(fs.readFileSync(TB_PATH, "utf-8"));
}

export async function POST(req: Request) {
  try {
    const { textbookIds } = await req.json();
    const allTextbooks = readTextbooks();
    const targets = allTextbooks.filter((t) => textbookIds.includes(t.id));

    if (targets.length === 0) {
      return NextResponse.json({ error: "未找到指定教材" }, { status: 404 });
    }

    const allChunks = targets.flatMap((tb) => chunkTextbook(tb));
    const texts = allChunks.map((c) => c.text);
    const embeddings = await batchEmbed(texts);

    const entries: VectorEntry[] = allChunks.map((chunk, i) => ({
      chunk,
      embedding: embeddings[i],
    }));

    saveVectors(entries);

    return NextResponse.json({ ok: true, chunkCount: entries.length });
  } catch (e: any) {
    console.error("RAG index error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
