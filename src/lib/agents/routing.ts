import { applyPicks, buildCandidates, pickFromCandidates, pullBlockedMissions, type DispatchPick } from "@/lib/dispatch";
import { roadsOnPath, travelMinutes } from "@/lib/geo";
import type { Assignment, DispatchCandidate, Hazard, Incident, ResourceAsset } from "@/lib/types";

export type ClerkAssignHint = {
  incidentId: string;
  resourceId: string;
  reason: string;
};

function rankScore(c: DispatchCandidate) {
  return c.fit * 3 - c.etaMin - c.danger * 2 - c.blockedOnPath.length * 12;
}

function resolveHintId(candidates: DispatchCandidate[], hint?: ClerkAssignHint) {
  if (!hint?.resourceId) return undefined;
  const id = hint.resourceId.trim().toLowerCase();
  const hit =
    candidates.find((c) => c.resourceId.toLowerCase() === id) ||
    candidates.find((c) => c.callsign.toLowerCase() === id) ||
    candidates.find((c) => c.callsign.toLowerCase().includes(id));
  return hit?.resourceId;
}

export function needsAssignment(incidents: Incident[], incidentId?: string) {
  return [...incidents]
    .filter((i) => i.status !== "resolved")
    .filter((i) => (incidentId ? i.id === incidentId : i.status === "open" || i.status === "rerouted"))
    .sort((a, b) => a.rank - b.rank);
}

export function candidatesForIncident(
  incident: Incident,
  resources: ResourceAsset[],
  hazards: Hazard[],
  used: Set<string>,
): DispatchCandidate[] {
  return buildCandidates(incident, resources, hazards)
    .map((c) => ({
      ...c,
      available: c.available && c.status === "free" && !used.has(c.resourceId),
    }))
    .sort((a, b) => Number(b.available) - Number(a.available) || rankScore(b) - rankScore(a));
}

export function assignOpenMissions(input: {
  incidents: Incident[];
  resources: ResourceAsset[];
  assignments: Assignment[];
  hazards: Hazard[];
  incidentId?: string;
  clerkPicks?: ClerkAssignHint[];
  model?: string;
}): {
  incidents: Incident[];
  resources: ResourceAsset[];
  assignments: Assignment[];
  notes: string[];
  picks: DispatchPick[];
} {
  const used = new Set<string>();
  const picks: DispatchPick[] = [];

  for (const inc of needsAssignment(input.incidents, input.incidentId)) {
    const already = input.assignments.find((a) => a.incidentId === inc.id && a.status === "active");
    if (already && !input.incidentId) continue;
    const hint = input.clerkPicks?.find((p) => p.incidentId === inc.id);
    const candidates = candidatesForIncident(inc, input.resources, input.hazards, used);
    const pick = pickFromCandidates(inc, candidates, resolveHintId(candidates, hint), hint?.reason, input.model);
    if (!pick) continue;
    used.add(pick.resourceId);
    picks.push(pick);
  }

  const next = applyPicks({
    incidents: input.incidents,
    resources: input.resources,
    assignments: input.assignments,
    picks,
  });
  return { ...next, picks };
}

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

    const assigned = assignOpenMissions({
      incidents: pulled.incidents,
      resources: pulled.resources,
      assignments: pulled.assignments,
      hazards: input.hazards,
    });
    return {
      incidents: assigned.incidents,
      resources: assigned.resources,
      assignments: assigned.assignments,
      notes: [...notes, ...assigned.notes],
    };
  },
};

export function etaHint(fromId: string, toId: string, blocked: Set<string>) {
  return { eta: travelMinutes(fromId, toId, blocked), via: roadsOnPath(fromId, toId) };
}
