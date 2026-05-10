"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Brain, Loader2 } from "lucide-react";
import type { KnowledgePoint, Relation } from "@/lib/types";

interface GraphNode {
  id: string;
  name: string;
  frequency: number;
  textbookId: string;
  category: string;
  definition: string;
  val?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  description: string;
}

const COLOR_PALETTE = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

export default function GraphView({ textbookId }: { textbookId: string | null }) {
  const [kps, setKps] = useState<KnowledgePoint[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ForceGraph, setForceGraph] = useState<any>(null);

  // 动态导入 react-force-graph-2d（避免 SSR 问题）
  useEffect(() => {
    import("react-force-graph-2d").then((mod) => setForceGraph(() => mod.default));
  }, []);

  const buildGraph = useCallback(async () => {
    if (!textbookId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textbookId }),
      });
      if (res.ok) {
        const data = await res.json();
        setKps(data.knowledgePoints || []);
        setRelations(data.relations || []);
      } else {
        const err = await res.json();
        alert("构建失败: " + (err.error || "未知错误"));
      }
    } catch (e: any) {
      alert("构建失败: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [textbookId]);

  // 如果本地已有缓存，尝试加载
  useEffect(() => {
    if (!textbookId) {
      setKps([]);
      setRelations([]);
      return;
    }
    // 不自动构建，等待用户点击按钮
  }, [textbookId]);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = kps.map((kp) => ({
      id: kp.id,
      name: kp.name,
      frequency: kp.frequency,
      textbookId: kp.textbookId,
      category: kp.category,
      definition: kp.definition,
    }));

    const links: GraphLink[] = relations
      .filter((r) => nodes.some((n) => n.id === r.source) && nodes.some((n) => n.id === r.target))
      .map((r) => ({
        source: r.source,
        target: r.target,
        type: r.type,
        description: r.description,
      }));

    return { nodes, links };
  }, [kps, relations]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const ids = Array.from(new Set(kps.map((kp) => kp.textbookId)));
    ids.forEach((id, i) => {
      map[id] = COLOR_PALETTE[i % COLOR_PALETTE.length];
    });
    return map;
  }, [kps]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    setSheetOpen(true);
  }, []);

  if (!textbookId) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <h2 className="text-lg font-semibold">知识图谱</h2>
        </div>
        <div className="flex-1 bg-background relative flex items-center justify-center">
          <p className="text-sm text-muted-foreground">请在左侧选择一本教材</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <h2 className="text-lg font-semibold">知识图谱</h2>
        <Button onClick={buildGraph} disabled={loading} size="sm">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
          {loading ? "构建中..." : "构建图谱"}
        </Button>
      </div>

      <div className="flex-1 bg-background relative">
        {graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {loading ? "LLM 正在抽取知识点，请稍候..." : "点击「构建图谱」开始抽取"}
            </p>
          </div>
        ) : ForceGraph ? (
          <ForceGraph
            graphData={graphData}
            nodeVal={(n: any) => Math.log(n.frequency + 1) * 4}
            nodeColor={(n: any) => colorMap[n.textbookId] || "#999"}
            linkColor={() => "#cbd5e1"}
            linkWidth={1}
            nodeLabel={(n: any) => `${n.name} (${n.category})`}
            onNodeClick={handleNodeClick}
            backgroundColor="transparent"
            width={undefined}
            height={undefined}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedNode?.name}</SheetTitle>
            <SheetDescription>
              <Badge className="mb-2">{selectedNode?.category}</Badge>
              <p className="text-sm mt-2">{selectedNode?.definition}</p>
              <p className="text-xs text-muted-foreground mt-4">
                出现频次: {selectedNode?.frequency}
              </p>
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  );
}
