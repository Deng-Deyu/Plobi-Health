import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Textbook, KnowledgePoint, Relation } from "@/lib/types";
import { extractFromChapter } from "@/lib/extract";

export const maxDuration = 60;
export const runtime = "nodejs";

const TB_PATH = path.join(process.cwd(), "tmp", "textbooks.json");

function readTextbooks(): Textbook[] {
  if (!fs.existsSync(TB_PATH)) return [];
  return JSON.parse(fs.readFileSync(TB_PATH, "utf-8"));
}

function kgPath(textbookId: string) {
  return path.join(process.cwd(), "tmp", `kg-${textbookId}.json`);
}

function readKg(textbookId: string): { knowledgePoints: KnowledgePoint[]; relations: Relation[] } | null {
  const p = kgPath(textbookId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function writeKg(textbookId: string, data: { knowledgePoints: KnowledgePoint[]; relations: Relation[] }) {
  const dir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const p = kgPath(textbookId);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// 简单信号量并发控制
async function runWithLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array(limit).fill(null).map(() => worker()));
  return results;
}

export async function POST(req: Request) {
  try {
    const { textbookId } = await req.json();

    // 优先读取缓存
    const cached = readKg(textbookId);
    if (cached) {
      return NextResponse.json(cached);
    }

    const textbooks = readTextbooks();
    const textbook = textbooks.find((t) => t.id === textbookId);
    if (!textbook) {
      return NextResponse.json({ error: "教材不存在" }, { status: 404 });
    }

    // 过滤掉空章节和过短章节（目录/前言）
    const validChapters = textbook.chapters.filter((ch) => ch.charCount >= 200);

    if (validChapters.length === 0) {
      return NextResponse.json({ error: "教材没有有效的正文章节（字数 < 200 的已过滤）" }, { status: 400 });
    }

    const tasks = validChapters.map((ch) => async () => {
      const result = await extractFromChapter(ch.title, ch.text);
      // 注入 textbookId / chapterId
      result.knowledgePoints.forEach((kp) => {
        kp.textbookId = textbookId;
        kp.chapterId = ch.id;
      });
      return result;
    });

    const chapterResults = await runWithLimit(tasks, 5);

    const allKps: KnowledgePoint[] = [];
    const allRelations: Relation[] = [];

    chapterResults.forEach((r) => {
      allKps.push(...r.knowledgePoints);
      allRelations.push(...r.relations);
    });

    // 去重：相同 name 的 KP 合并 frequency
    const kpMap = new Map<string, KnowledgePoint>();
    for (const kp of allKps) {
      const existing = kpMap.get(kp.name);
      if (existing) {
        existing.frequency += 1;
      } else {
        kpMap.set(kp.name, kp);
      }
    }
    const uniqueKps = Array.from(kpMap.values());

    const result = { knowledgePoints: uniqueKps, relations: allRelations };
    writeKg(textbookId, result);

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Extract error:", e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
