import { NextResponse } from "next/server";
import { assignOpenMissions, candidatesForIncident, needsAssignment } from "@/lib/agents/routing";
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

  const needs = needsAssignment(incidents, body.incidentId);
  const idle = new Set<string>();
  const candidatesByIncident: Record<string, ReturnType<typeof candidatesForIncident>> = {};
  for (const inc of needs) {
    candidatesByIncident[inc.id] = candidatesForIncident(inc, resources, hazards, idle);
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

  const next = assignOpenMissions({
    incidents,
    resources,
    assignments,
    hazards,
    incidentId: body.incidentId,
    clerkPicks: clerk?.picks.map((p) => ({
      incidentId: p.incidentId,
      resourceId: p.resourceId,
      reason: p.reason,
    })),
    model: clerk?.model,
  });

  return NextResponse.json({
    ok: true,
    studied: Boolean(clerk),
    model: clerk?.model,
    picks: next.picks,
    notes: next.notes,
    incidents: next.incidents,
    resources: next.resources,
    assignments: next.assignments,
  });
}
