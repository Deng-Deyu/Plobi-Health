"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("chat-history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem("chat-history", JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, initialized]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.message?.content || "",
        toolCall: data.message?.toolCall,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // 如果决策被更新，通知其他组件刷新
      if (data.updatedDecisions) {
        window.dispatchEvent(new CustomEvent("decisions-updated"));
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "出错了，请重试", ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {messages.length === 0 && (
          <div className="text-xs text-muted-foreground text-center mt-10">
            开始对话，可以询问知识整合相关问题
          </div>
        )}
        {messages.map((m, i) => (
          <Card key={i} className={m.role === "user" ? "bg-primary/5" : ""}>
            <CardContent className="p-2 text-sm whitespace-pre-wrap">
              <div className="font-medium text-xs text-muted-foreground mb-1">
                {m.role === "user" ? "用户" : "助手"}
              </div>
              {m.content}
              {m.toolCall && (
                <div className="mt-1 text-xs text-muted-foreground border-t pt-1">
                  工具调用: {m.toolCall.name}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input
          placeholder="输入消息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={send} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "发送"}
        </Button>
      </div>
    </div>
  );
}
