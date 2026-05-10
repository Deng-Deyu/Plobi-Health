"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Citation {
  textbookName: string;
  chapter: string;
  page?: number;
  snippet: string;
}

export default function RagPanel({ textbookIds }: { textbookIds: string[] }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);

  async function buildIndex() {
    setIndexing(true);
    try {
      const res = await fetch("/api/rag/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textbookIds }),
      });
      const data = await res.json();
      alert(data.ok ? `索引建立成功，共 ${data.chunkCount} 个片段` : data.error);
    } catch (e) {
      alert("索引失败");
    } finally {
      setIndexing(false);
    }
  }

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, topK: 5 }),
      });
      const data = await res.json();
      setAnswer(data.answer || "");
      setCitations(data.citations || []);
    } catch (e) {
      setAnswer("查询出错");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      <Button onClick={buildIndex} disabled={indexing || textbookIds.length === 0} variant="outline">
        {indexing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        建立索引
      </Button>

      <div className="flex gap-2">
        <Input
          placeholder="输入问题..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <Button onClick={ask} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "提问"}
        </Button>
      </div>

      {answer && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">回答</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{answer}</CardContent>
        </Card>
      )}

      {citations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">引用来源</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {citations.map((c, i) => (
              <div key={i} className="text-xs text-muted-foreground border-l-2 pl-2">
                <div className="font-medium">
                  《{c.textbookName}》{c.chapter} {c.page ? `第${c.page}页` : ""}
                </div>
                <div className="truncate">{c.snippet}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
