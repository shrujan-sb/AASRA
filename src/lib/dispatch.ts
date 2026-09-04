import { roadsOnPath, travelMinutes } from "@/lib/geo";
import { nid } from "@/lib/ids";
import type {
  Assignment,
  DispatchCandidate,
  Hazard,
  Incident,
  IncidentPick,
  InfraAsset,
  ResourceAsset,
} from "@/lib/types";

export function fitScore(res: ResourceAsset, incident: Incident): number {
  const n = `${incident.resource} ${incident.title} ${incident.locationLabel}`.toLowerCase();
  const gear = `${res.skills.join(" ")} ${res.equipment.join(" ")} ${res.kind}`.toLowerCase();
  let score = 0;
  if (/boat|evac|rooftop|trapped|drown|flood-rescue|rescue/.test(n)) {
    if (/flood-rescue|flood/.test(gear)) score += 48;
    if (/boat/.test(gear)) score += 36;
    if (res.kind === "team") score += 10;
  }
  if (/nurse|medical|trauma|ambulance/.test(n)) {
    if (res.kind === "medical") score += 44;
    if (/nurse|doctor|trauma/.test(gear)) score += 22;
    if (/ambulance/.test(gear)) score += 28;
  }
  if (/generator|power|icu/.test(n) && /gen|power/.test(gear)) score += 40;
  if (/water|tanker/.test(n) && /tanker|water/.test(gear)) score += 40;
  if (/blanket|food|ration/.test(n) && (res.kind === "supply" || res.kind === "vehicle" || /blanket|food/.test(gear))) {
    score += 24;
  }
  if (/truck|lorry/.test(n) && res.kind === "vehicle") score += 18;
  if (res.kind === "team") score += 6;
  return score;
}

export function dangerScore(incident: Incident, blockedOnPath: string[]): number {
  let d = incident.severity === "critical" ? 8 : incident.severity === "high" ? 5 : 2;
  if (blockedOnPath.length) d += 3;
  if (/rooftop|drown|trapped|icu|collapse/.test(`${incident.title} ${incident.resource}`)) d += 2;
  return Math.min(10, d);
}

export function becauseLine(c: DispatchCandidate): string {
  const gear = c.equipment[0] || c.skills[0] || c.kind;
  return `${c.callsign} is best because ${gear}, ${c.etaMin} min.`;
}

export function buildCandidates(
  incident: Incident,
  resources: ResourceAsset[],
  hazards: Hazard[],
): DispatchCandidate[] {
  const blocked = new Set(hazards.filter((h) => h.status === "blocked").map((h) => h.roadId));
  return resources.map((r) => {
    const viaRoadIds = roadsOnPath(r.locationId, incident.locationId);
    const blockedOnPath = viaRoadIds.filter((id) => blocked.has(id));
    const etaMin = travelMinutes(r.locationId, incident.locationId, blocked);
    const available = r.status === "free" || r.assignedIncidentId === incident.id;
    const fit = fitScore(r, incident);
    return {
      resourceId: r.id,
      callsign: r.callsign,
      kind: r.kind,
      skills: r.skills,
      equipment: r.equipment,
      status: r.status,
      locationId: r.locationId,
      etaMin,
      fit,
      danger: dangerScore(incident, blockedOnPath),
      available,
      viaRoadIds,
      blockedOnPath,
    };
  });
}

export function heuristicPick(candidates: DispatchCandidate[]): DispatchCandidate | null {
  const open = candidates.filter((c) => c.available && c.status === "free");
  const ranked = [...open].sort((a, b) => {
    const sa = a.fit * 3 - a.etaMin - a.danger * 2 - a.blockedOnPath.length * 12;
    const sb = b.fit * 3 - b.etaMin - b.danger * 2 - b.blockedOnPath.length * 12;
    return sb - sa;
  });
  const best = ranked[0];
  if (!best || best.fit < 8) return null;
  return best;
}

export type DispatchPick = {
  incidentId: string;
  resourceId: string;
  reason: string;
  etaMin: number;
  viaRoadIds: string[];
  model?: string;
};

export function pickFromCandidates(
  incident: Incident,
  candidates: DispatchCandidate[],
  chosenId?: string,
  reason?: string,
  model?: string,
): DispatchPick | null {
  const chosen = chosenId
    ? candidates.find((c) => c.resourceId === chosenId && c.available)
    : heuristicPick(candidates);
  const best = chosen ?? heuristicPick(candidates);
  if (!best) return null;
  return {
    incidentId: incident.id,
    resourceId: best.resourceId,
    reason: reason?.trim() || becauseLine(best),
    etaMin: best.etaMin,
    viaRoadIds: best.viaRoadIds,
    model,
  };
}

export function applyPicks(input: {
  incidents: Incident[];
  resources: ResourceAsset[];
  assignments: Assignment[];
  picks: DispatchPick[];
}): { incidents: Incident[]; resources: ResourceAsset[]; assignments: Assignment[]; notes: string[] } {
  const incidents = input.incidents.map((i) => ({ ...i }));
  const resources = input.resources.map((r) => ({ ...r }));
  let assignments = input.assignments.map((a) => ({ ...a }));
  const notes: string[] = [];

  for (const pick of input.picks) {
    const inc = incidents.find((i) => i.id === pick.incidentId);
    const unit = resources.find((r) => r.id === pick.resourceId);
    if (!inc || !unit) continue;
    if (unit.status !== "free" && unit.assignedIncidentId !== inc.id) continue;

    for (const a of assignments.filter((x) => x.incidentId === inc.id && x.status === "active")) {
      a.status = "cancelled";
      a.updatedAt = Date.now();
      const old = resources.find((r) => r.id === a.resourceId);
      if (old && old.id !== unit.id) {
        old.status = "free";
        old.assignedIncidentId = undefined;
      }
    }

    const assignment: Assignment = {
      id: nid("ASN"),
      incidentId: inc.id,
      resourceId: unit.id,
      etaMin: pick.etaMin,
      viaRoadIds: pick.viaRoadIds,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reason: pick.reason,
    };
    assignments = [...assignments, assignment];
    unit.status = "assigned";
    unit.assignedIncidentId = inc.id;
    inc.status = "assigned";
    inc.updatedAt = Date.now();
    inc.aiPick = {
      resourceId: unit.id,
      callsign: unit.callsign,
      reason: pick.reason,
      etaMin: pick.etaMin,
      model: pick.model,
    };
    notes.push(pick.reason);
  }

  return { incidents, resources, assignments, notes };
}

export function pullBlockedMissions(input: {
  incidents: Incident[];
  resources: ResourceAsset[];
  assignments: Assignment[];
  hazards: Hazard[];
}): {
  incidents: Incident[];
  resources: ResourceAsset[];
  assignments: Assignment[];
  affected: { assignmentId: string; incidentId: string; roads: string[] }[];
} {
  const blocked = new Set(input.hazards.filter((h) => h.status === "blocked").map((h) => h.roadId));
  const incidents = input.incidents.map((i) => ({ ...i }));
  const resources = input.resources.map((r) => ({ ...r }));
  const assignments = input.assignments.map((a) => ({ ...a }));
  const affected: { assignmentId: string; incidentId: string; roads: string[] }[] = [];

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
    const inc = incidents.find((i) => i.id === a.incidentId);
    if (inc) {
      inc.status = "rerouted";
      inc.updatedAt = Date.now();
    }
    affected.push({ assignmentId: a.id, incidentId: a.incidentId, roads: hits });
  }

  return { incidents, resources, assignments, affected };
}

export function heuristicInfraRank(rows: InfraAsset[], hazards: Hazard[]): InfraAsset[] {
  const blocked = new Set(hazards.filter((h) => h.status === "blocked").map((h) => h.roadId));
  const now = Date.now();
  const scored = rows.map((row) => {
    const shut = blocked.has(row.roadId);
    const status: InfraAsset["status"] = shut ? "blocked" : row.damage >= 6 ? "damaged" : "open";
    const score =
      row.damage * 3 +
      row.traffic * 2 +
      row.hospitalAccess * 4 +
      row.evacRoute * 4 +
      row.population * 2 +
      (shut ? 28 : 0);
    const consequences: string[] = [];
    if (row.hospitalAccess >= 8) consequences.push("Hospital access delayed");
    if (row.evacRoute >= 8) consequences.push("Evacuation corridor squeezed");
    if (row.population >= 7) consequences.push("Dense wards cut off");
    if (shut) consequences.push(`${row.name} closed — traffic dumped onto remaining roads`);
    const reason = shut
      ? `Repair ${row.name} first among closed links: damage ${row.damage}/10, hospital ${row.hospitalAccess}/10, evac ${row.evacRoute}/10.`
      : `${row.name} ranks on damage ${row.damage}, traffic ${row.traffic}, hospital ${row.hospitalAccess}, evac ${row.evacRoute}, population ${row.population}.`;
    return { ...row, status, score, reason, consequences: consequences.slice(0, 4), updatedAt: now, rank: 0 };
  });
  scored.sort((a, b) => b.score - a.score);
  scored.forEach((row, i) => {
    row.rank = i + 1;
  });
  return scored;
}

export function toIncidentPick(unit: ResourceAsset, pick: DispatchPick): IncidentPick {
  return {
    resourceId: unit.id,
    callsign: unit.callsign,
    reason: pick.reason,
    etaMin: pick.etaMin,
    model: pick.model,
  };
}
