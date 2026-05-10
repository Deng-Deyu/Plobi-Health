import mammoth from "mammoth";
import type { Chapter } from "@/lib/types";

export async function parseDocx(file: File): Promise<{
  text: string;
  chapters: Chapter[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;

  // 先尝试按 MD 标题风格切分（有些 docx 转换后保留 # 标题）
  const lines = text.split("\n");
  const chapters: Chapter[] = [];
  let currentTitle = "前言";
  let currentText = "";
  let chapterIndex = 0;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      if (currentText.trim()) {
        const t = currentText.trim();
        chapters.push({
          id: `ch_${chapterIndex}`,
          title: currentTitle,
          index: chapterIndex,
          text: t,
          charCount: t.length,
        });
        chapterIndex++;
      }
      currentTitle = match[2].trim();
      currentText = "";
    } else {
      currentText += line + "\n";
    }
  }

  if (currentText.trim()) {
    const t = currentText.trim();
    chapters.push({
      id: `ch_${chapterIndex}`,
      title: currentTitle,
      index: chapterIndex,
      text: t,
      charCount: t.length,
    });
  }

  if (chapters.length === 0) {
    chapters.push({
      id: "ch_0",
      title: file.name.replace(/\.docx$/i, ""),
      index: 0,
      text: text.trim(),
      charCount: text.trim().length,
    });
  }

  return { text: text.trim(), chapters };
}
