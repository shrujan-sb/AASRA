import { NextResponse } from "next/server";
import { clerkClaim } from "@/lib/featherless";
import type { DispatchCandidate, Incident, IncidentHelper, IncidentNear, Severity } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    incident?: Pick<Incident, "id" | "title" | "locationLabel" | "severity" | "nearest" | "helper" | "resource" | "aiPick">;
    helper?: IncidentHelper;
    km?: number;
    candidates?: DispatchCandidate[];
  };
  const incident = body.incident;
  const helper = body.helper;
  if (!incident?.id || !helper?.email) {
    return NextResponse.json({ ok: false, error: "Missing ticket or unit." }, { status: 400 });
  }
  if (incident.helper) {
    return NextResponse.json({
      ok: true,
      allow: false,
      summary: `${incident.helper.orgName} are already helping them.`,
    });
  }

  const clerk = await clerkClaim({
    title: incident.title,
    location: incident.locationLabel,
    severity: (["critical", "high", "normal"].includes(incident.severity) ? incident.severity : "normal") as Severity,
    resource: incident.resource,
    nearest: incident.nearest as IncidentNear[] | undefined,
    helperName: helper.name,
    helperOrg: helper.orgName,
    helperKind: helper.kind,
    helperEmail: helper.email,
    helperKm: typeof body.km === "number" ? body.km : undefined,
    aiPick: incident.aiPick?.reason,
    candidates: body.candidates?.map((c) => ({
      callsign: c.callsign,
      etaMin: c.etaMin,
      fit: c.fit,
      equipment: c.equipment,
      available: c.available,
    })),
  });

  if (!clerk) {
    return NextResponse.json({ ok: true, allow: true, summary: "Clerk offline — take it if you can move.", studied: false });
  }

  return NextResponse.json({
    ok: true,
    allow: clerk.allow,
    summary: clerk.summary,
    confidence: clerk.confidence,
    studied: true,
  });
}
