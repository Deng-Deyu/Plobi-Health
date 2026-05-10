import { NextResponse } from "next/server";
import { batchEmbed, chat } from "@/lib/doubao";
import { loadVectors, searchVectors } from "@/lib/rag";

export const maxDuration = 60;
export const runtime = "nodejs";

const RAG_PROMPT = `你是严格的教材问答助手。仅基于下方【上下文】回答问题。
- 必须在回答中标注引用，格式：[《教材名》第X章 第X页]
- 引用必须来自给定上下文的 metadata，禁止编造
- 若上下文不足，回复："根据现有教材内容，无法回答该问题。"

【上下文】
{contexts}

【问题】
{question}
`;

export async function POST(req: Request) {
  try {
    const { question, topK = 5 } = await req.json();
    const entries = loadVectors();

    if (entries.length === 0) {
      return NextResponse.json(
        { answer: "尚未建立索引，请先点击「建立索引」。", citations: [] },
        { status: 200 }
      );
    }

    const [qEmbed] = await batchEmbed([question]);
    const top = searchVectors(qEmbed, entries, topK);

    const contexts = top
      .map(
        (t, i) =>
          `[${i + 1}] 《${t.chunk.textbookName}》${t.chunk.chapterTitle} ${
            t.chunk.page ? `第${t.chunk.page}页` : ""
          }\n${t.chunk.text}`
      )
      .join("\n\n");

    const prompt = RAG_PROMPT.replace("{contexts}", contexts).replace(
      "{question}",
      question
    );

    const msg = await chat([{ role: "user", content: prompt }]);
    const answer = msg.content || "";

    const citations = top.map((t) => ({
      textbookName: t.chunk.textbookName,
      chapter: t.chunk.chapterTitle,
      page: t.chunk.page,
      snippet: t.chunk.text.slice(0, 120),
    }));

    return NextResponse.json({ answer, citations });
  } catch (e: any) {
    console.error("RAG query error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
