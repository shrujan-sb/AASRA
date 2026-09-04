import { NextResponse } from "next/server";
import { detectAndTranslate } from "@/lib/featherless";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { text?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const text = String(body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ ok: false, error: "text is required." }, { status: 400 });
  }
  const clerk = await detectAndTranslate(text);
  if (!clerk) {
    return NextResponse.json({
      ok: true,
      studied: false,
      language: /[\u0C00-\u0C7F]/.test(text) ? "te" : /[\u0900-\u097F]/.test(text) ? "hi" : "en",
      translated: text,
    });
  }
  return NextResponse.json({
    ok: true,
    studied: true,
    language: clerk.language,
    translated: clerk.translated,
    model: clerk.model,
  });
}
