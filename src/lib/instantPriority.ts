import { categoryFor, categoryRank } from "@/lib/policy";
import type { Incident } from "@/lib/types";

export function asIncidentList(raw: unknown): Incident[] {
  if (!Array.isArray(raw)) return [];
  const out: Incident[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || !r.id) continue;
    const status = r.status === "assigned" || r.status === "rerouted" || r.status === "resolved" ? r.status : "open";
    out.push({
      ...(row as Incident),
      id: r.id,
      status,
      priorityScore: typeof r.priorityScore === "number" ? r.priorityScore : 0,
      severity: r.severity === "critical" || r.severity === "high" ? r.severity : "normal",
      title: String(r.title ?? r.id),
      resource: String(r.resource ?? "aid"),
      locationLabel: String(r.locationLabel ?? ""),
      locationId: String(r.locationId ?? ""),
    });
  }
  return out;
}

export function rankOpenIncidents(incidents: Incident[]): Incident[] {
  const open = incidents.filter((i) => i.status !== "resolved");
  const next = open.map((i) => ({ ...i }));
  next.sort(
    (a, b) =>
      (b.priorityScore || 0) - (a.priorityScore || 0) ||
      categoryRank(categoryFor(b.resource, b.title)) - categoryRank(categoryFor(a.resource, a.title)),
  );
  next.forEach((inc, idx) => {
    inc.rank = idx + 1;
  });
  return next;
}
