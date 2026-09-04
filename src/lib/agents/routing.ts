import { roadsOnPath, travelMinutes } from "@/lib/geo";
import type { Assignment, Hazard, Incident, ResourceAsset } from "@/lib/types";
import { nid } from "@/lib/db";

function skillMatch(res: ResourceAsset, need: string): number {
  const n = need.toLowerCase();
  let score = 0;
  if (n.includes("boat") && res.equipment.some((e) => /boat/i.test(e))) score += 40;
  if (n.includes("nurse") && res.skills.some((s) => /medic|nurse/i.test(s))) score += 40;
  if (n.includes("medical") && res.kind === "medical") score += 36;
  if (n.includes("generator") && res.equipment.some((e) => /gen/i.test(e))) score += 34;
  if (n.includes("water") && res.equipment.some((e) => /tanker|water/i.test(e))) score += 34;
  if (n.includes("blanket") || n.includes("food")) {
    if (res.kind === "supply" || res.kind === "vehicle") score += 22;
  }
  if (n.includes("rescue") && res.equipment.some((e) => /flood|rescue/i.test(e))) score += 44;
  if (n.includes("truck") && res.kind === "vehicle") score += 20;
  if (res.kind === "team") score += 8;
  return score;
}

export const RoutingAgent = {
  name: "routing" as const,
  memory: { lastRerouteAt: 0 },
  run(input: {
    incidents: Incident[];
    resources: ResourceAsset[];
    assignments: Assignment[];
    hazards: Hazard[];
  }): { resources: ResourceAsset[]; assignments: Assignment[]; notes: string[] } {
    const blocked = new Set(input.hazards.filter((h) => h.status === "blocked").map((h) => h.roadId));
    const notes: string[] = [];
    const resources = input.resources.map((r) => ({ ...r }));
    let assignments = input.assignments.map((a) => ({ ...a }));

    for (const a of assignments.filter((x) => x.status === "active")) {
      const hits = a.viaRoadIds.filter((id) => blocked.has(id));
      if (!hits.length) continue;
      a.status = "rerouted";
      a.updatedAt = Date.now();
      const unit = resources.find((r) => r.id === a.resourceId);
      if (unit) {
        unit.status = "free";
        unit.assignedIncidentId = undefined;
      }
      const inc = input.incidents.find((i) => i.id === a.incidentId);
      if (inc) inc.status = "rerouted";
      notes.push(`Reroute: ${a.resourceId} pulled off ${hits.join(",")} blocked`);
      this.memory.lastRerouteAt = Date.now();
    }

    const needs = [...input.incidents]
      .filter((i) => i.status === "open" || i.status === "rerouted")
      .sort((a, b) => a.rank - b.rank);

    for (const inc of needs) {
      const already = assignments.find((a) => a.incidentId === inc.id && a.status === "active");
      if (already) continue;
      const candidates = resources
        .filter((r) => r.status === "free")
        .map((r) => {
          const eta = travelMinutes(r.locationId, inc.locationId, blocked);
          const fit = skillMatch(r, inc.resource);
          return { r, eta, fit, score: fit * 2 - eta };
        })
        .sort((a, b) => b.score - a.score);
      const best = candidates[0];
      if (!best || best.fit < 8) continue;
      const via = roadsOnPath(best.r.locationId, inc.locationId);
      const assignment: Assignment = {
        id: nid("ASN"),
        incidentId: inc.id,
        resourceId: best.r.id,
        etaMin: best.eta,
        viaRoadIds: via,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        reason: `${best.r.callsign} assigned — ${best.r.equipment.slice(0, 2).join(", ") || best.r.skills[0]} · ${best.eta} min ETA from ${best.r.locationId}${via.length ? ` via ${via.join("/")}` : ""}`,
      };
      assignments = [...assignments, assignment];
      best.r.status = "assigned";
      best.r.assignedIncidentId = inc.id;
      inc.status = "assigned";
      notes.push(assignment.reason);
    }

    return { resources, assignments, notes };
  },
};
