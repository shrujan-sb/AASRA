import { NextResponse } from "next/server";
import { fallbackSitrep } from "@/lib/agents/summary";
import { composeSitrep } from "@/lib/featherless";
import type { Hazard, Incident, ResourceAsset } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: {
    incidents?: Incident[];
    resources?: ResourceAsset[];
    hazards?: Hazard[];
    tick?: number;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const incidents = Array.isArray(body.incidents) ? body.incidents : [];
  const resources = Array.isArray(body.resources) ? body.resources : [];
  const hazards = Array.isArray(body.hazards) ? body.hazards : [];
  const tick = typeof body.tick === "number" ? body.tick : 0;
  try {
    const clerk = await composeSitrep({ incidents, resources, hazards, tick, timeoutMs: 8000 });
    const sitrep = clerk ?? fallbackSitrep({ incidents, resources, hazards, tick });
    sitrep.tick = tick;
    sitrep.generatedAt = Date.now();
    return NextResponse.json({
      ok: true,
      sitrep,
      studied: Boolean(clerk),
      model: sitrep.model,
    });
  } catch (err) {
    console.error("sitrep route", err);
    const sitrep = fallbackSitrep({ incidents, resources, hazards, tick });
    sitrep.tick = tick;
    return NextResponse.json({ ok: true, sitrep, studied: false, model: sitrep.model });
  }
}
