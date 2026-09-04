import { NextResponse } from "next/server";
import { fallbackBrief } from "@/lib/delta";
import { predictBefore } from "@/lib/featherless";
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

async function run(body: { resources?: unknown; incidents?: unknown; hazards?: unknown }, timeoutMs: number) {
  const resources = asResources(body.resources);
  const incidents = asIncidents(body.incidents);
  const hazards = asHazards(body.hazards);
  const clerk =
    timeoutMs > 0 ? await predictBefore({ resources, incidents, hazards, timeoutMs }) : null;
  const brief = clerk ?? fallbackBrief({ resources, incidents, hazards });
  return { ok: true as const, brief, studied: Boolean(clerk) };
}

export async function GET() {
  const data = await run({}, 8000);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  let body: { resources?: unknown; incidents?: unknown; hazards?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const data = await run(body, 32000);
  return NextResponse.json(data);
}
