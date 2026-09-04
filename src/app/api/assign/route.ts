import { NextResponse } from "next/server";
import { applyPicks, buildCandidates, pickFromCandidates, type DispatchPick } from "@/lib/dispatch";
import { assignRescueTeams } from "@/lib/featherless";
import type { Assignment, Hazard, Incident, ResourceAsset } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    incidentId?: string;
    incidents?: Incident[];
    resources?: ResourceAsset[];
    assignments?: Assignment[];
    hazards?: Hazard[];
  };
  const incidents = body.incidents ?? [];
  const resources = body.resources ?? [];
  const assignments = body.assignments ?? [];
  const hazards = body.hazards ?? [];
  if (!incidents.length || !resources.length) {
    return NextResponse.json({ ok: false, error: "No tickets or units." }, { status: 400 });
  }

  const needs = incidents
    .filter((i) => i.status === "open" || i.status === "rerouted" || i.id === body.incidentId)
    .filter((i) => (body.incidentId ? i.id === body.incidentId : true))
    .filter((i) => i.status !== "resolved");

  const candidatesByIncident: Record<string, ReturnType<typeof buildCandidates>> = {};
  for (const inc of needs) {
    candidatesByIncident[inc.id] = buildCandidates(inc, resources, hazards);
  }

  const clerk = await assignRescueTeams({
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

  const next = applyPicks({ incidents, resources, assignments, picks });
  return NextResponse.json({
    ok: true,
    studied: Boolean(clerk),
    model: clerk?.model,
    picks,
    notes: next.notes,
    incidents: next.incidents,
    resources: next.resources,
    assignments: next.assignments,
  });
}
