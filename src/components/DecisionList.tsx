"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AlignDecision } from "@/lib/types";

export default function DecisionList({ decisions }: { decisions: AlignDecision[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">整合决策列表</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-60 overflow-y-auto">
        {decisions.length === 0 && (
          <div className="text-xs text-muted-foreground">暂无决策</div>
        )}
        {decisions.map((d) => (
          <div key={d.id} className="text-xs border rounded p-2 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={d.decision === "merge" ? "default" : d.decision === "remove" ? "destructive" : "secondary"}>
                {d.decision}
              </Badge>
              <span className="text-muted-foreground">置信度 {(d.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="font-medium">{d.mergedName || d.groupKpIds.join(", ")}</div>
            <div className="text-muted-foreground">{d.reason}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
