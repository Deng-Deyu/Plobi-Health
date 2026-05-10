import { NextResponse } from "next/server";
import { chat } from "@/lib/doubao";
import type { ChatMessage, AlignDecision } from "@/lib/types";

export const maxDuration = 60;
export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是知识整合助手，用户可以通过对话修改整合决策。
可用工具（仅在需要时调用）：
- update_decision(decisionId, newDecision, reason)
- list_decisions()

回复格式：直接文字回复，如需调用工具请输出 JSON：{"tool": "update_decision", "args": {...}}`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const msgs = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: ChatMessage) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const msg = await chat(msgs);
    const content = msg.content || "";

    // 尝试解析工具调用
    let toolCall: any = null;
    let updatedDecisions: AlignDecision[] | undefined;
    try {
      const brace = content.match(/\{[\s\S]*\}/);
      if (brace) {
        const parsed = JSON.parse(brace[0]);
        if (parsed.tool) {
          toolCall = { name: parsed.tool, args: parsed.args };
        }
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      message: {
        role: "assistant",
        content: content.replace(/\{[\s\S]*\}/, "").trim(),
        toolCall,
        ts: Date.now(),
      },
      updatedDecisions,
    });
  } catch (e: any) {
    console.error("Chat error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
