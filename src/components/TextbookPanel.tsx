"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, BookOpen, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { parsePdf } from "@/lib/parser/pdf";
import { parseMd } from "@/lib/parser/md";
import { parseTxt } from "@/lib/parser/txt";
import { parseDocx } from "@/lib/parser/docx";
import type { Textbook, Chapter } from "@/lib/types";
import { nanoid } from "nanoid";

export default function TextbookPanel({ onSelect }: { onSelect?: (id: string | null) => void }) {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/textbooks");
      if (res.ok) {
        const data = await res.json();
        setTextbooks(data.textbooks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() as
        | "pdf"
        | "md"
        | "txt"
        | "docx";

      let chapters: Chapter[];
      let fullText: string;

      if (ext === "pdf") {
        const result = await parsePdf(file);
        chapters = result.chapters;
        fullText = result.text;
      } else if (ext === "md") {
        const text = await file.text();
        chapters = parseMd(text);
        fullText = text;
      } else if (ext === "txt") {
        const text = await file.text();
        chapters = parseTxt(text);
        fullText = text;
      } else if (ext === "docx") {
        const result = await parseDocx(file);
        chapters = result.chapters;
        fullText = result.text;
      } else {
        alert("不支持的文件格式");
        setUploading(false);
        return;
      }

      const textbook: Textbook = {
        id: nanoid(),
        name: file.name.replace(/\.[^.]+$/, ""),
        format: ext,
        size: file.size,
        status: "ready",
        totalChars: fullText.length,
        chapters,
        uploadedAt: Date.now(),
      };

      const res = await fetch("/api/textbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textbook),
      });

      if (res.ok) {
        await fetchList();
      } else {
        const err = await res.json();
        alert("上传失败: " + (err.error || "未知错误"));
      }
    } catch (err: any) {
      alert("解析失败: " + err.message);
    } finally {
      setUploading(false);
      // 重置 input
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">教材管理</h2>
        <div className="relative">
          <input
            type="file"
            accept=".pdf,.md,.txt,.docx"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <Button className="w-full" disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "解析中..." : "上传教材"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          支持 PDF / MD / TXT / DOCX
        </p>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : textbooks.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            暂无教材，请上传
          </div>
        ) : (
          textbooks.map((tb) => (
            <Card key={tb.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader className="p-3 pb-0" onClick={() => {
                const next = expandedId === tb.id ? null : tb.id;
                setExpandedId(next);
                onSelect?.(next ? tb.id : null);
              }}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{tb.name}</span>
                  </CardTitle>
                  {expandedId === tb.id ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{tb.format.toUpperCase()}</Badge>
                  <span>{tb.chapters.length} 章</span>
                  <span>{(tb.size / 1024).toFixed(1)} KB</span>
                </div>
                {expandedId === tb.id && (
                  <div className="mt-2 space-y-1 border-t border-border pt-2">
                    {tb.chapters.map((ch) => (
                      <div
                        key={ch.id}
                        className="text-xs px-2 py-1 rounded hover:bg-accent"
                      >
                        <div className="font-medium">{ch.title}</div>
                        <div className="text-muted-foreground">
                          {ch.charCount} 字
                          {ch.pageStart ? ` · 第 ${ch.pageStart} 页` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
