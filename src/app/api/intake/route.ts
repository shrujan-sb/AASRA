import { NextResponse } from "next/server";
import { IntakeAgent } from "@/lib/agents/intake";
import type { InboxMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<InboxMessage>;
  const rawText = String(body.rawText ?? "").trim();
  if (!rawText) {
    return NextResponse.json({ ok: false, error: "rawText is required." }, { status: 400 });
  }
  const msg: InboxMessage = {
    id: String(body.id ?? `IN-${Date.now()}`),
    rawText,
    source: String(body.source ?? "field"),
    timestamp: typeof body.timestamp === "number" ? body.timestamp : Date.now(),
    languageHint: body.languageHint,
    processed: Boolean(body.processed),
  };
  const parsed = await IntakeAgent.runAsync(msg);
  return NextResponse.json({ ok: true, parsed });
}
