import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Textbook } from "@/lib/types";
import { TMP_DIR } from "@/lib/paths";

export const maxDuration = 60;
export const runtime = "nodejs";

const DB_PATH = path.join(TMP_DIR, "textbooks.json");

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([]));
  }
}

function readDb(): Textbook[] {
  ensureDb();
  const data = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(data);
}

function writeDb(textbooks: Textbook[]) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(textbooks, null, 2));
}

export async function GET() {
  try {
    const textbooks = readDb();
    return NextResponse.json({ textbooks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const textbook: Textbook = await req.json();
    const textbooks = readDb();
    textbooks.push(textbook);
    writeDb(textbooks);
    return NextResponse.json({ ok: true, id: textbook.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const textbooks = readDb();
    const filtered = textbooks.filter((tb) => tb.id !== id);
    
    if (filtered.length === textbooks.length) {
      return NextResponse.json({ error: "Textbook not found" }, { status: 404 });
    }

    writeDb(filtered);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
