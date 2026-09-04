import type { Assignment, Hazard, Incident, ResourceAsset, Sitrep, StructuredEvent } from "@/lib/types";

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
    const active = input.incidents.filter((i) => i.status !== "resolved");
    const critical = active.filter((i) => i.severity === "critical").length;
    const high = active.filter((i) => i.severity === "high").length;
    const roadsBlocked = input.hazards.filter((h) => h.status === "blocked").length;
    const freeUnits = input.resources.filter((r) => r.status === "free").length;
    const assignedUnits = input.resources.filter((r) => r.status !== "free").length;
    const shelter = active.find((i) => /water|shelter/i.test(i.resource + i.title));
    const predictions: string[] = [];
    if (shelter) predictions.push("Water shortage predicted at Shelter B within 3 hours");
    if (roadsBlocked) predictions.push("East-bank ETAs inflated by blocked corridor");
    if (critical >= 2) predictions.push("Medical desk saturation if two more evacs arrive");

    const headline = `${active.length} active · ${critical} critical · ${roadsBlocked} roads blocked · ${freeUnits} units free`;
    this.memory.lastHeadline = headline;

    return {
      id: "current",
      generatedAt: Date.now(),
      activeIncidents: active.length,
      critical,
      high,
      roadsBlocked,
      freeUnits,
      assignedUnits,
      headline,
      predictions: predictions.slice(0, 3),
      tick: input.tick,
    };
  },
};
