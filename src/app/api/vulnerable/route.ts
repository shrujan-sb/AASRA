import { NextResponse } from "next/server";
import { fallbackVulnerable } from "@/lib/delta";
import type { Hazard, Incident } from "@/lib/types";

export const dynamic = "force-dynamic";

function asIncidents(raw: unknown): Incident[] {
  return Array.isArray(raw) ? (raw as Incident[]) : [];
}

function asHazards(raw: unknown): Hazard[] {
  return Array.isArray(raw) ? (raw as Hazard[]) : [];
}

export async function GET() {
  const map = fallbackVulnerable({});
  return NextResponse.json({
    ok: true,
    studied: false,
    windowHours: map.windowHours,
    headline: map.headline,
    sites: map.sites,
    fallback: true,
  });
}

export async function POST(req: Request) {
  let body: { incidents?: unknown; hazards?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const map = fallbackVulnerable({
    incidents: asIncidents(body.incidents),
    hazards: asHazards(body.hazards),
  });
  return NextResponse.json({
    ok: true,
    studied: false,
    windowHours: map.windowHours,
    headline: map.headline,
    sites: map.sites,
    fallback: true,
  });
}
