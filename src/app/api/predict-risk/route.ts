import { NextResponse } from "next/server";
import { sectorContextText, WARD_PROFILES } from "@/lib/delta";
import { brainRaw } from "@/lib/featherless";
import { WARDS } from "@/lib/geo";
import type { Hazard, Incident, PrepRisk } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LEVELS = new Set(["high", "elevated", "watch"]);

function asIncidents(raw: unknown): Incident[] {
  return Array.isArray(raw) ? (raw as Incident[]) : [];
}

function asHazards(raw: unknown): Hazard[] {
  return Array.isArray(raw) ? (raw as Hazard[]) : [];
}

function sentenceFor(name: string, level: PrepRisk["level"], hours: number): string {
  const span = hours <= 36 ? "24–48" : "48";
  const tone = level === "high" ? "unusually high" : level === "elevated" ? "elevated" : "watch-level";
  return `${name} has ${tone} flood risk over the next ${span} hours.`;
}

function scoreWard(id: string, hazards: Hazard[], incidents: Incident[]): number {
  const p = WARD_PROFILES.find((w) => w.id === id);
  let n = 0;
  if (p?.city === "Tenali") n += 40;
  if (p?.id === "W17" || p?.id === "W3" || p?.id === "W4") n += 36;
  if (p?.id === "W5" || p?.id === "W15" || p?.id === "W8") n += 22;
  if (p && p.population > 20000) n += 10;
  if (/canal|island|nala|paddy|lowest/i.test(p?.terrain ?? "")) n += 16;
  n += incidents.filter((i) => i.locationId === id && i.status !== "resolved").length * 8;
  n += hazards.filter((h) => h.status === "blocked" && p && h.label.includes(p.city)).length * 12;
  return n;
}

function fallbackWards(incidents: Incident[], hazards: Hazard[]): PrepRisk[] {
  return [...WARDS]
    .map((w) => ({ w, score: scoreWard(w.id, hazards, incidents) }))
    .sort((a, b) => b.score - a.score)
    .map((row, i) => {
      const p = WARD_PROFILES.find((x) => x.id === row.w.id);
      const level: PrepRisk["level"] = i === 0 ? "high" : i < 5 ? "elevated" : "watch";
      const horizonHours = i === 0 ? 36 : i < 5 ? 48 : 48;
      return {
        wardId: row.w.id,
        wardName: row.w.name,
        level,
        horizonHours,
        blurb: sentenceFor(row.w.name, level, horizonHours),
        drivers: [
          p?.rainfallNote ?? "rainfall",
          p?.terrain ?? "terrain",
          p?.history ?? "history",
          p ? `population ${p.population}` : "population",
        ],
      };
    });
}

function coerceWards(raw: unknown, fallback: PrepRisk[]): PrepRisk[] {
  if (!Array.isArray(raw)) return fallback;
  const byId = new Map(WARDS.map((w) => [w.id, w]));
  const seen = new Set<string>();
  const rows: PrepRisk[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const wardId = String(r.wardId ?? "");
    const ward = byId.get(wardId);
    if (!ward || seen.has(wardId)) continue;
    seen.add(wardId);
    const levelRaw = String(r.level ?? "");
    const level: PrepRisk["level"] = LEVELS.has(levelRaw) ? (levelRaw as PrepRisk["level"]) : "elevated";
    const horizonHours =
      typeof r.horizonHours === "number" ? Math.min(48, Math.max(24, Math.round(r.horizonHours))) : 48;
    const blurb = String(r.sentence ?? r.blurb ?? "").trim() || sentenceFor(ward.name, level, horizonHours);
    rows.push({
      wardId,
      wardName: ward.name,
      level,
      horizonHours,
      blurb,
      drivers: Array.isArray(r.drivers) ? r.drivers.map(String).slice(0, 6) : [],
    });
  }
  for (const miss of fallback) {
    if (!seen.has(miss.wardId)) rows.push(miss);
  }
  const rank = (l: PrepRisk["level"]) => (l === "high" ? 0 : l === "elevated" ? 1 : 2);
  return rows.sort((a, b) => rank(a.level) - rank(b.level) || a.wardName.localeCompare(b.wardName));
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
  const fallback = fallbackWards(incidents, hazards);
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

Predict 24–48 hour flood risk for every Krishna-delta ward listed above. Reason from rainfall, terrain, flood history, and population. Do not invent ward ids.
Return JSON only:
{"headline":"one sentence like: Ward 17 has unusually high flood risk over the next 24–48 hours.","windowHours":48,"wards":[{"wardId":"W17","level":"high"|"elevated"|"watch","horizonHours":36,"sentence":"Ward 17 has unusually high flood risk over the next 24–48 hours.","drivers":["rainfall","terrain","history","population"]}]}

Rules: Include every ward id from WARDS. horizonHours must be 24–48. sentence must name the ward and the 24–48h window. Mark canal-belt and island wards (W17, W3, W4) high if rain is on the sector. Not every ward is high.`,
    28000,
    2200,
  );

  const wards = coerceWards(hit?.json.wards, fallback);
  const headline = String(hit?.json.headline ?? "").trim() || wards[0]?.blurb || fallback[0].blurb;
  const windowHours =
    typeof hit?.json.windowHours === "number" ? Math.min(48, Math.max(24, hit.json.windowHours)) : 48;

  return NextResponse.json({
    ok: true,
    studied: Boolean(hit),
    model: hit?.model,
    windowHours,
    headline,
    wards,
  });
}
