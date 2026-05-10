export type TextbookId = string;

export interface Textbook {
  id: TextbookId;
  name: string;
  format: 'pdf' | 'md' | 'txt' | 'docx';
  size: number;
  status: 'parsing' | 'ready' | 'error';
  totalChars: number;
  chapters: Chapter[];
  uploadedAt: number;
}

export interface Chapter {
  id: string;
  title: string;
  index: number;
  pageStart?: number;
  pageEnd?: number;
  text: string;
  charCount: number;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  definition: string;
  category: '概念' | '定理' | '方法' | '现象' | '其他';
  textbookId: TextbookId;
  chapterId: string;
  page?: number;
  frequency: number;
  sourceSpans: { chunkId: string; text: string }[];
}

export interface Relation {
  id: string;
  source: string;
  target: string;
  type: '前置依赖' | '并列' | '包含' | '应用';
  description: string;
}

export interface Chunk {
  id: string;
  textbookId: TextbookId;
  textbookName: string;
  chapterId: string;
  chapterTitle: string;
  page?: number;
  text: string;
  embedding?: number[];
}

export interface AlignDecision {
  id: string;
  groupKpIds: string[];
  decision: 'merge' | 'keep' | 'remove';
  reason: string;
  confidence: number;
  mergedName?: string;
  modifiedByUser?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCall?: { name: string; args: any; result?: any };
  ts: number;
}
