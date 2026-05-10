import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Textbook, KnowledgePoint, Relation } from "@/lib/types";
import { alignKnowledgePoints } from "@/lib/align";

export const maxDuration = 60;
export const runtime = "nodejs";

const TB_PATH = path.join(process.cwd(), "tmp", "textbooks.json");

function readTextbooks(): Textbook[] {
  if (!fs.existsSync(TB_PATH)) return [];
  return JSON.parse(fs.readFileSync(TB_PATH, "utf-8"));
}

function readKg(textbookId: string): { knowledgePoints: KnowledgePoint[]; relations: Relation[] } | null {
  const p = path.join(process.cwd(), "tmp", `kg-${textbookId}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export async function POST(req: Request) {
  try {
    const { textbookIds } = await req.json();
    const allTextbooks = readTextbooks();
    const targets = allTextbooks.filter((t) => textbookIds.includes(t.id));

    if (targets.length < 2) {
      return NextResponse.json({ error: "至少需要 2 本教材" }, { status: 400 });
    }

    let allKps: KnowledgePoint[] = [];
    let allRelations: Relation[] = [];
    let originalChars = 0;

    for (const tb of targets) {
      const kg = readKg(tb.id);
      if (kg) {
        allKps.push(...kg.knowledgePoints);
        allRelations.push(...kg.relations);
      }
      originalChars += tb.totalChars;
    }

    const result = await alignKnowledgePoints(allKps, allRelations, originalChars);

    // 写入对齐结果
    const dir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "aligned.json"), JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Align error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
