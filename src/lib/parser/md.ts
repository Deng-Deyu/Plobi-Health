import type { Chapter } from "@/lib/types";

export function parseMd(text: string): Chapter[] {
  const lines = text.split("\n");
  const chapters: Chapter[] = [];
  let currentTitle = "前言";
  let currentText = "";
  let chapterIndex = 0;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      if (currentText.trim()) {
        const text = currentText.trim();
        chapters.push({
          id: `ch_${chapterIndex}`,
          title: currentTitle,
          index: chapterIndex,
          text,
          charCount: text.length,
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
    const text = currentText.trim();
    chapters.push({
      id: `ch_${chapterIndex}`,
      title: currentTitle,
      index: chapterIndex,
      text,
      charCount: text.length,
    });
  }

  // 如果没有切出任何章节，整篇作为一章
  if (chapters.length === 0) {
    chapters.push({
      id: "ch_0",
      title: "全文",
      index: 0,
      text: text.trim(),
      charCount: text.trim().length,
    });
  }

  return chapters;
}
