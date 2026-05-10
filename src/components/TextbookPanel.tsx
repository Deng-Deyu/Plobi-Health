"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, BookOpen, FileText, ChevronDown, ChevronRight, X } from "lucide-react";
import { parsePdf } from "@/lib/parser/pdf";
import { parseMd } from "@/lib/parser/md";
import { parseTxt } from "@/lib/parser/txt";
import { parseDocx } from "@/lib/parser/docx";
import type { Textbook, Chapter } from "@/lib/types";
import { nanoid } from "nanoid";

interface UploadTask {
  id: string;
  fileName: string;
  status: "parsing" | "ready" | "error";
  errorMsg?: string;
}

export default function TextbookPanel({ onSelect }: { onSelect?: (id: string | null) => void }) {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const parseFile = async (file: File): Promise<{ chapters: Chapter[]; fullText: string }> => {
    const ext = file.name.split(".").pop()?.toLowerCase() as
      | "pdf"
      | "md"
      | "txt"
      | "docx";

    if (ext === "pdf") {
      const result = await parsePdf(file);
      return { chapters: result.chapters, fullText: result.text };
    } else if (ext === "md") {
      const text = await file.text();
      return { chapters: parseMd(text), fullText: text };
    } else if (ext === "txt") {
      const text = await file.text();
      return { chapters: parseTxt(text), fullText: text };
    } else if (ext === "docx") {
      const result = await parseDocx(file);
      return { chapters: result.chapters, fullText: result.text };
    }
    throw new Error("不支持的文件格式: " + ext);
  };

  const uploadSingle = async (file: File) => {
    const taskId = nanoid();
    setTasks((prev) => [...prev, { id: taskId, fileName: file.name, status: "parsing" }]);

    try {
      const { chapters, fullText } = await parseFile(file);

      const textbook: Textbook = {
        id: nanoid(),
        name: file.name.replace(/\.[^.]+$/, ""),
        format: file.name.split(".").pop()?.toLowerCase() as any,
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "上传失败");
      }

      await fetchList();
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "error", errorMsg: err.message } : t
        )
      );
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) =>
      /\.(pdf|md|txt|docx)$/i.test(f.name)
    );
    if (valid.length === 0) {
      alert("请选择 PDF / MD / TXT / DOCX 文件");
      return;
    }
    await Promise.all(valid.map((f) => uploadSingle(f)));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">教材管理</h2>
        <div
          className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.md,.txt,.docx"
            multiple
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">拖拽文件到此处或点击上传</p>
          <p className="text-xs text-muted-foreground mt-1">
            支持批量上传 PDF / MD / TXT / DOCX
          </p>
        </div>
      </div>

      {/* 上传任务状态 */}
      {tasks.length > 0 && (
        <div className="px-3 pt-3 space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`text-xs flex items-center justify-between rounded p-2 border ${
                task.status === "error"
                  ? "bg-destructive/10 border-destructive/30"
                  : task.status === "parsing"
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted border-border"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-3 h-3 shrink-0" />
                <span className="truncate">{task.fileName}</span>
                <Badge
                  variant={
                    task.status === "error"
                      ? "destructive"
                      : task.status === "parsing"
                      ? "default"
                      : "secondary"
                  }
                  className="text-[10px] h-4"
                >
                  {task.status === "parsing" ? "解析中" : task.status === "error" ? "失败" : "已完成"}
                </Badge>
              </div>
              <button onClick={() => removeTask(task.id)} className="shrink-0">
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

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
            <Card
              key={tb.id}
              className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                tb.status === "error" ? "border-destructive" : ""
              }`}
            >
              <CardHeader
                className="p-3 pb-0"
                onClick={() => {
                  const next = expandedId === tb.id ? null : tb.id;
                  setExpandedId(next);
                  onSelect?.(next ? tb.id : null);
                }}
              >
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <Badge variant="outline">{tb.format.toUpperCase()}</Badge>
                  <span>{tb.chapters.length} 章</span>
                  <span>{(tb.size / 1024).toFixed(1)} KB</span>
                  {tb.status === "error" && (
                    <Badge variant="destructive" className="text-[10px]">失败</Badge>
                  )}
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
