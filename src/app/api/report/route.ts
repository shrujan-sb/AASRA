import { NextResponse } from "next/server";
import { buildPublicReport } from "@/lib/buildPublicReport";
import { reasonFromStudy, studyReport } from "@/lib/featherless";
import { rankNearestSupport } from "@/lib/nearest";
import type { ApprovedSupport } from "@/lib/types";

export const maxDuration = 60;

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

  let units: ApprovedSupport[] = [];
  if (typeof ticket.incident.lat === "number" && typeof ticket.incident.lng === "number") {
    const rows = await import("@/lib/firestoreRest")
      .then((m) => m.listFirestoreCol("approvedSupport"))
      .catch(() => [] as Record<string, unknown>[]);
    units = rows.map((r) => ({
      id: String(r.id ?? r.email ?? ""),
      email: String(r.email ?? r.id ?? ""),
      kind: r.kind === "government" ? "government" : "ngo",
      name: typeof r.name === "string" ? r.name : undefined,
      orgName: typeof r.orgName === "string" ? r.orgName : undefined,
      lat: typeof r.lat === "number" ? r.lat : undefined,
      lng: typeof r.lng === "number" ? r.lng : undefined,
    })) satisfies ApprovedSupport[];
    ticket.incident.nearest = rankNearestSupport(units, ticket.incident.lat, ticket.incident.lng);
  }

  const study = await studyReport({
    location,
    need,
    name: body.name,
    heuristicSeverity: ticket.incident.severity,
    heuristicScore: ticket.incident.priorityScore,
    resource: ticket.incident.resource,
    nearest: ticket.incident.nearest,
  });

  if (study) {
    ticket.incident.reason = reasonFromStudy(study);
    if (study.severity) ticket.incident.severity = study.severity;
    if (typeof study.priorityScore === "number") {
      ticket.incident.priorityScore = Math.max(0, Math.min(250, study.priorityScore));
    }
    if (study.resource) ticket.incident.resource = study.resource;
    if (typeof study.quantity === "number") ticket.incident.quantity = study.quantity;
    if (study.title) ticket.incident.title = study.title;
    if (study.verification) ticket.incident.verification = study.verification;
    if (study.routeEmails?.length && ticket.incident.nearest?.length) {
      const order = new Map(study.routeEmails.map((e, i) => [e.toLowerCase(), i]));
      ticket.incident.nearest = [...ticket.incident.nearest].sort((a, b) => {
        const ia = order.has(a.email.toLowerCase()) ? order.get(a.email.toLowerCase())! : 99;
        const ib = order.has(b.email.toLowerCase()) ? order.get(b.email.toLowerCase())! : 99;
        return ia - ib || a.km - b.km;
      });
    }
    ticket.incident.updatedAt = Date.now();
    ticket.log.agent = "summary";
    ticket.log.message = `Clerk decided ${ticket.incident.severity} ${ticket.incident.priorityScore} @ ${ticket.incident.locationLabel}${study.decision ? ` — ${study.decision}` : ""}`;
  }

  const payload = JSON.parse(JSON.stringify(ticket)) as typeof ticket;

  void import("@/lib/firestoreRest")
    .then((m) =>
      Promise.all([
        m.createFirestoreDoc("inbox", payload.inbox.id, payload.inbox as unknown as Record<string, unknown>),
        m.createFirestoreDoc("events", payload.event.id, payload.event as unknown as Record<string, unknown>),
        m.createFirestoreDoc("incidents", payload.incident.id, payload.incident as unknown as Record<string, unknown>),
        m.createFirestoreDoc("agentLogs", payload.log.id, payload.log as unknown as Record<string, unknown>),
      ]),
    )
    .catch(() => undefined);

  return NextResponse.json({
    ok: true,
    id: payload.inbox.id,
    incidentId: payload.incident.id,
    studied: Boolean(study),
    ticket: payload,
  });
}
