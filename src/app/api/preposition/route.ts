import { NextResponse } from "next/server";
import { fallbackPreposition } from "@/lib/delta";
import { planPreposition } from "@/lib/featherless";
import { SEED_RESOURCES } from "@/lib/seed";
import type { Hazard, Incident, ResourceAsset } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function asResources(raw: unknown): ResourceAsset[] {
  if (!Array.isArray(raw)) return SEED_RESOURCES;
  const rows = raw.filter((r): r is ResourceAsset => Boolean(r && typeof r === "object" && "id" in r));
  return rows.length ? rows : SEED_RESOURCES;
}

function asIncidents(raw: unknown): Incident[] {
  return Array.isArray(raw) ? (raw as Incident[]) : [];
}

function asHazards(raw: unknown): Hazard[] {
  return Array.isArray(raw) ? (raw as Hazard[]) : [];
}

export async function POST(req: Request) {
  let body: { resources?: unknown; incidents?: unknown; hazards?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const resources = asResources(body.resources);
  const incidents = asIncidents(body.incidents);
  const hazards = asHazards(body.hazards);
  const clerk = await planPreposition({ resources, incidents, hazards, timeoutMs: 32000 });
  const plan = clerk ?? fallbackPreposition({ resources, incidents, hazards });
  return NextResponse.json({ ok: true, plan, studied: Boolean(clerk) });
}
