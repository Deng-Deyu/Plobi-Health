"use client";

import type { Chapter } from "@/lib/types";

export async function parsePdf(file: File): Promise<{
  text: string;
  chapters: Chapter[];
}> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // 提取每页文本
  const pageTexts: { page: number; text: string }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item: any) => item.str).join("");
    pageTexts.push({ page: i, text });
  }

  const fullText = pageTexts.map((p) => p.text).join("\n");

  // 尝试读取大纲
  let outline: any[] | null = null;
  try {
    outline = await pdf.getOutline();
  } catch {
    outline = null;
  }

  // 如果有大纲，按大纲分章
  if (outline && outline.length > 0) {
    const chapters = await buildChaptersFromOutline(outline, pageTexts, pdf.numPages, pdf);
    return { text: fullText, chapters };
  }

  // 无大纲：尝试用正则识别章节标题
  const chapters = buildChaptersByRegex(pageTexts);
  if (chapters.length > 1) {
    return { text: fullText, chapters };
  }

  //  fallback：整本一个章节
  return {
    text: fullText,
    chapters: [
      {
        id: "ch_0",
        title: file.name.replace(/\.pdf$/i, ""),
        index: 0,
        pageStart: 1,
        pageEnd: pdf.numPages,
        text: fullText,
        charCount: fullText.length,
      },
    ],
  };
}

async function buildChaptersFromOutline(
  outline: any[],
  pageTexts: { page: number; text: string }[],
  totalPages: number,
  pdf: any
): Promise<Chapter[]> {
  const chapters: Chapter[] = [];
  let idx = 0;

  for (const item of outline) {
    const title = item.title || `章节 ${idx + 1}`;
    let startPage = 1;

    // 优先从 outline 的 dest 获取真实页码
    if (item.dest) {
      try {
        const explicitDest =
          typeof item.dest === "string"
            ? await pdf.getDestination(item.dest)
            : item.dest;
        if (explicitDest && explicitDest[0]) {
          const pageIndex = await pdf.getPageIndex(explicitDest[0]);
          startPage = pageIndex + 1; // pdfjs 页码从 0 开始
        }
      } catch {
        // dest 解析失败，继续 fallback
      }
    }

    // fallback：用标题在 pageTexts 中模糊匹配
    if (startPage === 1) {
      for (const pt of pageTexts) {
        if (pt.text.includes(title.slice(0, 10))) {
          startPage = pt.page;
          break;
        }
      }
    }

    chapters.push({
      id: `ch_${idx}`,
      title,
      index: idx,
      pageStart: startPage,
      text: "",
      charCount: 0,
    });
    idx++;
  }

  // 分配页面范围与文本
  for (let i = 0; i < chapters.length; i++) {
    const start = chapters[i].pageStart ?? 1;
    const nextStart = i < chapters.length - 1 ? (chapters[i + 1].pageStart ?? totalPages) : totalPages + 1;
    const end = Math.max(start, nextStart - 1);
    chapters[i].pageEnd = end;
    chapters[i].text = pageTexts
      .filter((p) => p.page >= start && p.page <= end)
      .map((p) => p.text)
      .join("\n");
    chapters[i].charCount = chapters[i].text.length;
  }

  // 安全检查：如果按大纲分章后所有章节文本都为空（页码全为1导致end<start），回退到正则分章
  const totalCharCount = chapters.reduce((sum, ch) => sum + ch.charCount, 0);
  if (totalCharCount === 0) {
    const regexChapters = buildChaptersByRegex(pageTexts);
    if (regexChapters.length > 0) return regexChapters;
  }

  return chapters;
}

function buildChaptersByRegex(
  pageTexts: { page: number; text: string }[]
): Chapter[] {
  const chapterRegex =
    /(?:第\s*[\d一二三四五六七八九十百千]+\s*[章篇节]|Chapter\s*\d+|\d+\.\d+\s+\S{3,})/gi;
  const allText = pageTexts.map((p) => `\n---PAGE_${p.page}---\n${p.text}`).join("");
  const matches = Array.from(allText.matchAll(chapterRegex));

  if (matches.length < 2) return [];

  const chapters: Chapter[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index ?? 0;
    const end = i < matches.length - 1 ? (matches[i + 1].index ?? allText.length) : allText.length;
    const chunk = allText.slice(start, end);
    const pageMatch = chunk.match(/---PAGE_(\d+)---/);
    const pageStart = pageMatch ? parseInt(pageMatch[1]) : 1;
    const text = chunk.replace(/---PAGE_\d+---/g, "").trim();
    chapters.push({
      id: `ch_${i}`,
      title: m[0].trim(),
      index: i,
      pageStart,
      text,
      charCount: text.length,
    });
  }
  return chapters;
}
