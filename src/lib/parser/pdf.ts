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

  // 如果文本提取失败（空或太少），使用 OCR 视觉模型兜底
  const MIN_TEXT_LENGTH = 100; // 最少字符数
  if (fullText.length < MIN_TEXT_LENGTH) {
    console.log(`[PDF] 文本提取失败 (${fullText.length} 字符)，使用 OCR 兜底...`);
    try {
      const ocrText = await parsePdfWithOCR(file, pdf);
      if (ocrText && ocrText.length > fullText.length) {
        return { text: ocrText, chapters: [{
          id: "ch_0",
          title: file.name.replace(/\.pdf$/i, ""),
          index: 0,
          pageStart: 1,
          pageEnd: pdf.numPages,
          text: ocrText,
          charCount: ocrText.length,
        }]};
      }
    } catch (ocrError) {
      console.error("[PDF] OCR 失败，使用空文本:", ocrError);
    }
  }

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

// OCR 兜底：将 PDF 前几页渲染为图片，调用视觉模型提取文本
async function parsePdfWithOCR(file: File, pdf: any): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const MAX_PAGES = Math.min(pdf.numPages, 5); // 最多处理前5页
  const images: string[] = [];

  // 渲染页面为图片
  for (let i = 1; i <= MAX_PAGES; i++) {
    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // 2倍分辨率提高识别率
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      images.push(dataUrl);
    } catch (e) {
      console.error(`[OCR] 第 ${i} 页渲染失败:`, e);
    }
  }

  if (images.length === 0) return "";

  // 调用 OCR API
  const response = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });

  if (!response.ok) {
    throw new Error(`OCR API 失败: ${response.status}`);
  }

  const { text } = await response.json();
  return text || "";
}
