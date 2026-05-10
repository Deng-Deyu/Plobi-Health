"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function CompressionStat({
  originalChars,
  integratedChars,
  ratio,
}: {
  originalChars: number;
  integratedChars: number;
  ratio: number;
}) {
  const percent = Math.round(ratio * 100);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">整合压缩比</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>原文 {originalChars.toLocaleString()} 字</span>
          <span>整合后 {integratedChars.toLocaleString()} 字</span>
        </div>
        <Progress value={percent} className="h-2" />
        <div className="text-center text-lg font-bold">{percent}%</div>
      </CardContent>
    </Card>
  );
}
