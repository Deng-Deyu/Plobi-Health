import fs from "fs";
import path from "path";
import { cosine } from "./doubao";
import type { Chunk } from "./types";

const VECTORS_PATH = path.join(process.cwd(), "tmp", "vectors.json");

export interface VectorEntry {
  chunk: Chunk;
  embedding: number[];
}

export function loadVectors(): VectorEntry[] {
  if (!fs.existsSync(VECTORS_PATH)) return [];
  return JSON.parse(fs.readFileSync(VECTORS_PATH, "utf-8"));
}

export function saveVectors(entries: VectorEntry[]) {
  const dir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(VECTORS_PATH, JSON.stringify(entries, null, 2));
}

export function searchVectors(
  queryEmbed: number[],
  entries: VectorEntry[],
  topK = 5
): { chunk: Chunk; score: number }[] {
  const scored = entries.map((e) => ({
    chunk: e.chunk,
    score: cosine(queryEmbed, e.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
