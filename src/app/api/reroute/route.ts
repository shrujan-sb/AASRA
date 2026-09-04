import { NextResponse } from "next/server";
import { applyPicks, buildCandidates, pickFromCandidates, pullBlockedMissions, type DispatchPick } from "@/lib/dispatch";
import { planReroute } from "@/lib/featherless";
import type { Assignment, Hazard, Incident, ResourceAsset } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    road?: string;
    incidents?: Incident[];
    resources?: ResourceAsset[];
    assignments?: Assignment[];
    hazards?: Hazard[];
  };
  const incidentsIn = body.incidents ?? [];
  const resourcesIn = body.resources ?? [];
  const assignmentsIn = body.assignments ?? [];
  const hazards = body.hazards ?? [];
  if (!incidentsIn.length && !assignmentsIn.length) {
    return NextResponse.json({ ok: false, error: "Nothing to reroute." }, { status: 400 });
  }

  const blockedIds = hazards.filter((h) => h.status === "blocked").map((h) => h.roadId);
  const pulled = pullBlockedMissions({
    incidents: incidentsIn,
    resources: resourcesIn,
    assignments: assignmentsIn,
    hazards,
  });

  const needs = pulled.incidents.filter((i) => i.status === "open" || i.status === "rerouted");
  const candidatesByIncident: Record<string, ReturnType<typeof buildCandidates>> = {};
  for (const inc of needs) {
    candidatesByIncident[inc.id] = buildCandidates(inc, pulled.resources, hazards);
  }

  const clerk = await planReroute({
    blockedLabel: body.road || blockedIds.join(", ") || "corridor",
    blockedRoadIds: blockedIds,
    affected: pulled.affected.map((a) => {
      const old = assignmentsIn.find((x) => x.id === a.assignmentId);
      const inc = incidentsIn.find((i) => i.id === a.incidentId);
      const unit = resourcesIn.find((r) => r.id === old?.resourceId);
      return {
        incidentId: a.incidentId,
        title: inc?.title ?? a.incidentId,
        roads: a.roads,
        oldEta: old?.etaMin ?? 0,
        oldUnit: unit?.callsign ?? old?.resourceId ?? "unit",
      };
    }),
    incidents: needs.map((i) => ({
      id: i.id,
      title: i.title,
      resource: i.resource,
      severity: i.severity,
      locationLabel: i.locationLabel,
    })),
    candidatesByIncident,
  });

  const used = new Set<string>();
  const picks: DispatchPick[] = [];
  for (const inc of needs.sort((a, b) => a.rank - b.rank)) {
    const row = clerk?.picks.find((p) => p.incidentId === inc.id);
    const cands = (candidatesByIncident[inc.id] ?? []).map((c) => ({
      ...c,
      available: c.available && c.status === "free" && !used.has(c.resourceId),
    }));
    const pick = pickFromCandidates(inc, cands, row?.resourceId, row?.reason, clerk?.model);
    if (!pick) continue;
    used.add(pick.resourceId);
    picks.push(pick);
  }

  const next = applyPicks({
    incidents: pulled.incidents,
    resources: pulled.resources,
    assignments: pulled.assignments,
    picks,
  });

  const notes = [
    clerk?.headline,
    ...(clerk?.alternatives ?? []).map((a) => `Alt: ${a}`),
    ...(clerk?.affected ?? []).map((a) => `Hit ${a.incidentId}: ${a.why}`),
    ...next.notes,
  ].filter(Boolean) as string[];

  return NextResponse.json({
    ok: true,
    studied: Boolean(clerk),
    model: clerk?.model,
    headline: clerk?.headline ?? notes[0] ?? "Corridor update applied.",
    alternatives: clerk?.alternatives ?? [],
    affected: clerk?.affected ?? pulled.affected.map((a) => ({ incidentId: a.incidentId, why: a.roads.join(",") })),
    picks,
    notes,
    incidents: next.incidents,
    resources: next.resources,
    assignments: next.assignments,
  });
}
