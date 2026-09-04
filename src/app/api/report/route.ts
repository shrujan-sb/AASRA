import { NextResponse } from "next/server";
import { buildPublicReport } from "@/lib/buildPublicReport";
import { reasonFromStudy, studyReport } from "@/lib/featherless";
import { rankNearestSupport } from "@/lib/nearest";
import { parseSupportKind } from "@/lib/supportKind";
import type { ApprovedSupport } from "@/lib/types";

export const maxDuration = 60;

function mapUnits(rows: Record<string, unknown>[]): ApprovedSupport[] {
  return rows.map((r) => ({
    id: String(r.id ?? r.email ?? ""),
    email: String(r.email ?? r.id ?? "").toLowerCase(),
    kind: parseSupportKind(r.kind),
    name: typeof r.name === "string" ? r.name : undefined,
    orgName: typeof r.orgName === "string" ? r.orgName : undefined,
    areaLabel: typeof r.areaLabel === "string" ? r.areaLabel : undefined,
    lat: typeof r.lat === "number" ? r.lat : undefined,
    lng: typeof r.lng === "number" ? r.lng : undefined,
  }));
}

async function enrichTicket(
  payload: Awaited<ReturnType<typeof buildPublicReport>>,
  location: string,
  need: string,
  name?: string,
) {
  const rest = await import("@/lib/firestoreRest");
  if (typeof payload.incident.lat === "number" && typeof payload.incident.lng === "number") {
    const units = mapUnits(await rest.listFirestoreCol("approvedSupport").catch(() => []));
    payload.incident.nearest = rankNearestSupport(units, payload.incident.lat, payload.incident.lng);
  }
  const study = await studyReport({
    location,
    need,
    name,
    heuristicSeverity: payload.incident.severity,
    heuristicScore: payload.incident.priorityScore,
    resource: payload.incident.resource,
    nearest: payload.incident.nearest,
  });
  if (study) {
    payload.incident.reason = reasonFromStudy(study);
    if (study.severity) payload.incident.severity = study.severity;
    if (typeof study.priorityScore === "number") {
      payload.incident.priorityScore = Math.max(0, Math.min(250, study.priorityScore));
    }
    if (study.resource) payload.incident.resource = study.resource;
    if (typeof study.quantity === "number") payload.incident.quantity = study.quantity;
    if (study.title) payload.incident.title = study.title;
    if (study.verification) payload.incident.verification = study.verification;
    payload.incident.updatedAt = Date.now();
    payload.log.message = `Clerk decided ${payload.incident.severity} ${payload.incident.priorityScore} @ ${payload.incident.locationLabel}`;
  }
  await Promise.all([
    rest.createFirestoreDoc("inbox", payload.inbox.id, payload.inbox as unknown as Record<string, unknown>),
    rest.createFirestoreDoc("events", payload.event.id, payload.event as unknown as Record<string, unknown>),
    rest.createFirestoreDoc("incidents", payload.incident.id, payload.incident as unknown as Record<string, unknown>),
    rest.createFirestoreDoc("agentLogs", payload.log.id, payload.log as unknown as Record<string, unknown>),
  ]);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    location?: string;
    need?: string;
    name?: string;
    lat?: number;
    lng?: number;
  };
  const location = String(body.location ?? "").trim();
  const need = String(body.need ?? "").trim();
  if (!location || !need) {
    return NextResponse.json({ ok: false, error: "Location and need are required." }, { status: 400 });
  }

  const ticket = await buildPublicReport({
    location,
    need,
    name: body.name,
    lat: typeof body.lat === "number" ? body.lat : undefined,
    lng: typeof body.lng === "number" ? body.lng : undefined,
  });

  const payload = JSON.parse(JSON.stringify(ticket)) as typeof ticket;
  void enrichTicket(payload, location, need, body.name).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    id: payload.inbox.id,
    incidentId: payload.incident.id,
    studied: false,
    ticket: payload,
  });
}
