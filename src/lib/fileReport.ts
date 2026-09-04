import { buildPublicReport, type PublicReportInput } from "@/lib/buildPublicReport";
import { persistTicketNow } from "@/lib/cloudOps";
import { reasonFromStudy, studyReport } from "@/lib/featherless";
import { rankNearestSupport } from "@/lib/nearest";
import { geocodePlace } from "@/lib/places";
import { parseSupportKind } from "@/lib/supportKind";
import type { ApprovedSupport } from "@/lib/types";

export type FiledReport = Awaited<ReturnType<typeof buildPublicReport>>;

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

async function enrichTicket(payload: FiledReport, location: string, need: string, name?: string) {
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
  await persistTicketNow(payload);
}

export async function filePublicReport(
  input: PublicReportInput,
  opts?: { wait?: boolean },
): Promise<{
  ok: true;
  id: string;
  incidentId: string;
  ticket: FiledReport;
}> {
  let lat = input.lat;
  let lng = input.lng;
  if ((lat == null || lng == null) && input.location.trim()) {
    const hit = await geocodePlace(input.location);
    if (hit) {
      lat = hit.lat;
      lng = hit.lng;
    }
  }
  const ticket = await buildPublicReport({ ...input, lat, lng });
  const payload = JSON.parse(JSON.stringify(ticket)) as FiledReport;
  await persistTicketNow(payload);
  const job = enrichTicket(payload, input.location, input.need, input.name).catch((err) => {
    console.error("file report enrich", err);
  });
  if (opts?.wait || input.channel === "phone") await job;
  else void job;
  return {
    ok: true,
    id: payload.inbox.id,
    incidentId: payload.incident.id,
    ticket: payload,
  };
}
