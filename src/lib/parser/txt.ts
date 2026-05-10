import type { Chapter } from "@/lib/types";

export function parseTxt(text: string): Chapter[] {
  // 先尝试用常见章节标题正则切分
  const chapterRegex =
    /^(?:第\s*[\d一二三四五六七八九十百千]+\s*[章篇节]|Chapter\s*\d+)(?:\s+.*)?$/gim;
  const matches = Array.from(text.matchAll(chapterRegex));

  if (matches.length >= 2) {
    const chapters: Chapter[] = [];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const start = m.index ?? 0;
      const end =
        i < matches.length - 1
          ? (matches[i + 1].index ?? text.length)
          : text.length;
      const chunk = text.slice(start, end).trim();
      chapters.push({
        id: `ch_${i}`,
        title: m[0].trim(),
        index: i,
        text: chunk,
        charCount: chunk.length,
      });
    }
    return chapters;
  }

  // fallback：整本作为一章
  return [
    {
      id: "ch_0",
      title: "全文",
      index: 0,
      text: text.trim(),
      charCount: text.trim().length,
    },
  ];
}
