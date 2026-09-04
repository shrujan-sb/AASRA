import { NextResponse } from "next/server";
import { parseOfferHeuristic, structureOffer, type OfferFields } from "@/lib/agents/offers";

export const dynamic = "force-dynamic";

function asFallback(raw: unknown, text: string): OfferFields {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const heuristic = parseOfferHeuristic(text);
    return {
      type: "offer",
      resource: typeof r.resource === "string" && r.resource.trim() ? r.resource.trim() : heuristic.resource,
      quantity: typeof r.quantity === "number" && r.quantity > 0 ? Math.round(r.quantity) : heuristic.quantity,
      locationId: typeof r.locationId === "string" && r.locationId.trim() ? r.locationId.trim() : heuristic.locationId,
      locationLabel:
        typeof r.locationLabel === "string" && r.locationLabel.trim() ? r.locationLabel.trim() : heuristic.locationLabel,
    };
  }
  return parseOfferHeuristic(text);
}

export async function POST(req: Request) {
  let body: { text?: string; fallback?: OfferFields } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const text = String(body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ ok: false, error: "Offer text is required." }, { status: 400 });
  }
  const fallback = asFallback(body.fallback, text);
  const structured = await structureOffer(text, fallback);
  const { model, ...offer } = structured;
  return NextResponse.json({
    ok: true,
    offer,
    studied: Boolean(model),
    model: model ?? null,
  });
}
