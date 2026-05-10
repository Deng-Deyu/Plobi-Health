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

  const images: string[] = [];
  const maxPages = Math.min(pdf.numPages, 3);
  
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport } as any).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.6));
  }

  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });

  if (!res.ok) {
    throw new Error("OCR Failed: " + await res.text());
  }

  const { text: ocrText } = await res.json();
  const fullText = ocrText || " ";
  const fakeCharCount = pdf.numPages * 800;

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
        charCount: fakeCharCount,
      },
    ],
  };
}
