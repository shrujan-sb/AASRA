import { NextResponse } from "next/server";
import { coerceVulnerable, fallbackVulnerable, sectorContextText } from "@/lib/delta";
import { brainRaw } from "@/lib/featherless";
import type { Hazard, Incident } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function asIncidents(raw: unknown): Incident[] {
  return Array.isArray(raw) ? (raw as Incident[]) : [];
}

function asHazards(raw: unknown): Hazard[] {
  return Array.isArray(raw) ? (raw as Hazard[]) : [];
}

export async function POST(req: Request) {
  let body: { incidents?: unknown; hazards?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const incidents = asIncidents(body.incidents);
  const hazards = asHazards(body.hazards);
  const fallback = fallbackVulnerable({ incidents, hazards });
  const open = incidents
    .filter((i) => i.status !== "resolved")
    .map((i) => `${i.id} ${i.severity} @${i.locationId} ${i.title}`)
    .join("\n");
  const blocked = hazards
    .filter((h) => h.status === "blocked")
    .map((h) => `${h.roadId} ${h.label}`)
    .join("; ");

  const hit = await brainRaw(
    `${sectorContextText()}

OPEN TICKETS:
${open || "(quiet)"}

BLOCKED ROADS: ${blocked || "none"}

Flood is likely in the next 24–48 hours. List the operational sites at risk. This is a list, not a map. Cover every kind: school, hospital, elderly, road, substation, shelter. Prefer names from CRITICAL SITES. Do not invent kinds. Do not write a ward-risk table. Do not recommend pre-position moves or resource ids.
Return JSON only:
{"headline":"one sentence: if the flood comes, which kinds of sites take the first hit.","windowHours":48,"sites":[{"kind":"school"|"hospital"|"elderly"|"road"|"substation"|"shelter","name":"...","wardId":"W17","why":"operational hit","action":"first move"}]}`,
    28000,
    2000,
  );

  const map = coerceVulnerable(hit?.json ?? {}, fallback);
  if (hit?.model) map.model = hit.model;
  map.fallback = !hit;

  return NextResponse.json({
    ok: true,
    studied: Boolean(hit),
    model: hit?.model,
    windowHours: map.windowHours,
    headline: map.headline,
    sites: map.sites,
    fallback: map.fallback,
  });
}
