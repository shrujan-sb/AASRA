import type { Assignment, Hazard, Incident, ResourceAsset, Sitrep, StructuredEvent } from "@/lib/types";

function shelterHits(incidents: Incident[]) {
  return incidents.filter((i) => {
    if (i.status === "resolved") return false;
    const blob = `${i.resource} ${i.title} ${i.locationLabel} ${i.locationId}`;
    return /shelter|water|food|ration|tanker/i.test(blob) || i.locationId === "SH-B" || i.locationId === "SH-C";
  });
}

export function fallbackSitrep(input: {
  incidents: Incident[];
  resources: ResourceAsset[];
  hazards: Hazard[];
  tick?: number;
}): Sitrep {
  const active = input.incidents.filter((i) => i.status !== "resolved");
  const critical = active.filter((i) => i.severity === "critical").length;
  const high = active.filter((i) => i.severity === "high").length;
  const roadsBlocked = input.hazards.filter((h) => h.status === "blocked").length;
  const freeUnits = input.resources.filter((r) => r.status === "free").length;
  const assignedUnits = input.resources.filter((r) => r.status !== "free").length;
  const shelterRows = shelterHits(active);
  const sheltersNearCapacity = Math.min(2, shelterRows.length);
  const named = shelterRows.find((i) => /shelter/i.test(i.locationLabel + i.title)) ?? shelterRows[0];
  const water = /water|tanker/i.test(named ? `${named.resource}${named.title}` : "") || shelterRows.length > 0;
  const predictedShortage = named
    ? water
      ? `Water shortage predicted at ${named.locationLabel} within 3 hours`
      : `Shelter pressure at ${named.locationLabel} — stores and space running short`
    : critical >= 2
      ? "Medical desk saturation if two more evacs arrive"
      : "";

  const predictions: string[] = [];
  if (predictedShortage) predictions.push(predictedShortage);
  if (roadsBlocked) predictions.push("East-bank ETAs inflated by blocked corridor");
  if (critical >= 2 && !predictions.some((p) => /medical/i.test(p))) {
    predictions.push("Medical desk saturation if two more evacs arrive");
  }

  return {
    id: "current",
    generatedAt: Date.now(),
    activeIncidents: active.length,
    critical,
    high,
    roadsBlocked,
    freeUnits,
    assignedUnits,
    sheltersNearCapacity,
    predictedShortage,
    headline: `${active.length} active · ${critical} critical · ${roadsBlocked} roads blocked · ${sheltersNearCapacity} shelters tight`,
    predictions: predictions.slice(0, 3),
    tick: input.tick ?? 0,
    fallback: true,
  };
}

export function coerceSitrep(raw: Record<string, unknown>, base: Sitrep): Sitrep {
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : d);
  const predictions = Array.isArray(raw.predictions) ? raw.predictions.map(String).filter(Boolean).slice(0, 4) : base.predictions;
  const predictedShortage = String(raw.predictedShortage ?? base.predictedShortage).trim();
  const headline = String(raw.headline ?? base.headline).trim() || base.headline;
  return {
    ...base,
    generatedAt: Date.now(),
    activeIncidents: num(raw.activeIncidents, base.activeIncidents),
    critical: num(raw.critical, base.critical),
    high: num(raw.high, base.high),
    roadsBlocked: num(raw.roadsBlocked, base.roadsBlocked),
    freeUnits: num(raw.freeUnits, base.freeUnits),
    assignedUnits: num(raw.assignedUnits, base.assignedUnits),
    sheltersNearCapacity: num(raw.sheltersNearCapacity, base.sheltersNearCapacity),
    predictedShortage,
    headline,
    predictions: predictions.length ? predictions : base.predictions,
    fallback: false,
  };
}

export const SummaryAgent = {
  name: "summary" as const,
  memory: { lastHeadline: "" },
  run(input: {
    incidents: Incident[];
    events: StructuredEvent[];
    resources: ResourceAsset[];
    assignments: Assignment[];
    hazards: Hazard[];
    tick: number;
  }): Sitrep {
    const sitrep = fallbackSitrep({
      incidents: input.incidents,
      resources: input.resources,
      hazards: input.hazards,
      tick: input.tick,
    });
    this.memory.lastHeadline = sitrep.headline;
    return sitrep;
  },
};
