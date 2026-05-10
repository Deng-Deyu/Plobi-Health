"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitCompare } from "lucide-react";
import CompressionStat from "./CompressionStat";
import DecisionList from "./DecisionList";
import type { KnowledgePoint, Relation, AlignDecision } from "@/lib/types";

export default function GraphCompare({ textbookIds }: { textbookIds: string[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    decisions: AlignDecision[];
    mergedKnowledgePoints: KnowledgePoint[];
    mergedRelations: Relation[];
    stats: { originalChars: number; integratedChars: number; ratio: number };
  } | null>(null);
  const [originalKps, setOriginalKps] = useState<KnowledgePoint[]>([]);

  useEffect(() => {
    async function loadOriginal() {
      const all: KnowledgePoint[] = [];
      for (const id of textbookIds) {
        try {
          const res = await fetch(`/api/extract`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ textbookId: id }),
          });
          if (res.ok) {
            const data = await res.json();
            all.push(...(data.knowledgePoints || []));
          }
        } catch {
          // ignore
        }
      }
      setOriginalKps(all);
    }
    if (textbookIds.length >= 2) loadOriginal();
  }, [textbookIds]);

  async function align() {
    if (textbookIds.length < 2) {
      alert("至少需要 2 本教材");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/align", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textbookIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const err = await res.json();
        alert("整合失败: " + (err.error || "未知错误"));
      }
    } catch (e: any) {
      alert("整合失败: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const merged = result?.mergedKnowledgePoints || [];
  const removedCount = originalKps.length - merged.length;
  const mergeCount = result?.decisions.filter((d) => d.decision === "merge").length || 0;

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      <Button onClick={align} disabled={loading || textbookIds.length < 2}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <GitCompare className="w-4 h-4 mr-2" />}
        {loading ? "整合中..." : "跨教材整合"}
      </Button>

      {result && (
        <>
          <CompressionStat
            originalChars={result.stats.originalChars}
            integratedChars={result.stats.integratedChars}
            ratio={result.stats.ratio}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">整合统计</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold">{originalKps.length}</div>
                <div className="text-xs text-muted-foreground">原始节点</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{merged.length}</div>
                <div className="text-xs text-muted-foreground">整合后节点</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-destructive">-{removedCount}</div>
                <div className="text-xs text-muted-foreground">去重/删除</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">{mergeCount}</div>
                <div className="text-xs text-muted-foreground">合并组</div>
              </div>
            </CardContent>
          </Card>

          <DecisionList decisions={result.decisions} />

          {/* 节点变化对比 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">节点变化</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-60 overflow-y-auto">
              {result.decisions.slice(0, 10).map((d) => (
                <div key={d.id} className="text-xs flex items-center gap-2 border rounded p-2">
                  <Badge
                    variant={
                      d.decision === "merge"
                        ? "default"
                        : d.decision === "remove"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {d.decision}
                  </Badge>
                  <span className="truncate">{d.mergedName || d.groupKpIds.join(", ")}</span>
                </div>
              ))}
              {result.decisions.length > 10 && (
                <div className="text-xs text-muted-foreground text-center">
                  还有 {result.decisions.length - 10} 项决策...
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
