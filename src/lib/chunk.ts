import type { Chunk, Textbook, Chapter } from "@/lib/types";
import { nanoid } from "nanoid";

export function chunkTextbook(
  textbook: Textbook,
  windowSize = 600,
  overlap = 80
): Chunk[] {
  const chunks: Chunk[] = [];

  for (const chapter of textbook.chapters) {
    const text = chapter.text;
    if (!text) continue;

    // 先按语义边界粗切
    const sentences = splitByBoundaries(text);
    let currentChunk = "";

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > windowSize && currentChunk.length > 0) {
        chunks.push(createChunk(textbook, chapter, currentChunk.trim(), chunks.length));
        // 保留重叠部分
        currentChunk = currentChunk.slice(-overlap) + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(createChunk(textbook, chapter, currentChunk.trim(), chunks.length));
    }
  }

  return chunks;
}

function splitByBoundaries(text: string): string[] {
  // 优先按 。！？\n\n 切分
  const regex = /([^。！？\n]+[。！？]|\n\n+)/g;
  const parts = text.split(regex).filter(Boolean);
  // 如果切分结果太大，再按单个字符切（fallback）
  const result: string[] = [];
  for (const part of parts) {
    if (part.length > 200) {
      // 长段落按句号再次切分
      const subParts = part.split(/([。！？])/);
      let merged = "";
      for (const sp of subParts) {
        merged += sp;
        if (/[。！？]/.test(sp) && merged.length > 50) {
          result.push(merged);
          merged = "";
        }
      }
      if (merged) result.push(merged);
    } else {
      result.push(part);
    }
  }
  return result;
}

function createChunk(
  textbook: Textbook,
  chapter: Chapter,
  text: string,
  index: number
): Chunk {
  return {
    id: `chunk_${nanoid(6)}`,
    textbookId: textbook.id,
    textbookName: textbook.name,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    page: chapter.pageStart,
    text,
  };
}
