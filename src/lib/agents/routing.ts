import { roadsOnPath, travelMinutes } from "@/lib/geo";
import { applyPicks, buildCandidates, pickFromCandidates, pullBlockedMissions } from "@/lib/dispatch";
import type { Assignment, Hazard, Incident, ResourceAsset } from "@/lib/types";

export const RoutingAgent = {
  name: "routing" as const,
  memory: { lastRerouteAt: 0 },
  run(input: {
    incidents: Incident[];
    resources: ResourceAsset[];
    assignments: Assignment[];
    hazards: Hazard[];
  }): {
    incidents: Incident[];
    resources: ResourceAsset[];
    assignments: Assignment[];
    notes: string[];
  } {
    const pulled = pullBlockedMissions(input);
    const notes = pulled.affected.map(
      (a) => `Reroute: ${a.incidentId} pulled off ${a.roads.join(",")} blocked`,
    );
    if (pulled.affected.length) this.memory.lastRerouteAt = Date.now();

    let { incidents, resources, assignments } = pulled;
    const used = new Set<string>();
    const needs = [...incidents]
      .filter((i) => i.status === "open" || i.status === "rerouted")
      .sort((a, b) => a.rank - b.rank);

    for (const inc of needs) {
      const already = assignments.find((a) => a.incidentId === inc.id && a.status === "active");
      if (already) continue;
      const candidates = buildCandidates(inc, resources, input.hazards).map((c) => ({
        ...c,
        available: c.available && c.status === "free" && !used.has(c.resourceId),
      }));
      const pick = pickFromCandidates(inc, candidates);
      if (!pick) continue;
      used.add(pick.resourceId);
      const next = applyPicks({ incidents, resources, assignments, picks: [pick] });
      incidents = next.incidents;
      resources = next.resources;
      assignments = next.assignments;
      notes.push(...next.notes);
    }

    return { incidents, resources, assignments, notes };
  },
};

export function etaHint(fromId: string, toId: string, blocked: Set<string>) {
  return { eta: travelMinutes(fromId, toId, blocked), via: roadsOnPath(fromId, toId) };
}
