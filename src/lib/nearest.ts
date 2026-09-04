import { kmBetween } from "@/lib/geoMath";
import { parseSupportKind, supportOrgFallback } from "@/lib/supportKind";
import type { ApprovedSupport, Incident, IncidentNear, SupportKind } from "@/lib/types";

export function rankNearestSupport(
  units: ApprovedSupport[],
  lat: number,
  lng: number,
  limit = 8,
): IncidentNear[] {
  return units
    .filter((u) => typeof u.lat === "number" && typeof u.lng === "number")
    .map((u) => ({
      email: u.email.toLowerCase(),
      name: u.name || u.email,
      orgName: u.orgName || u.name || supportOrgFallback(parseSupportKind(u.kind)),
      kind: parseSupportKind(u.kind),
      km: Math.round(kmBetween(lat, lng, u.lat!, u.lng!) * 10) / 10,
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

export function nearestOfKind(
  units: ApprovedSupport[],
  lat: number,
  lng: number,
  kind: SupportKind,
): IncidentNear | undefined {
  return rankNearestSupport(
    units.filter((u) => parseSupportKind(u.kind) === kind),
    lat,
    lng,
    1,
  )[0];
}

export function kmToIncident(me: Pick<ApprovedSupport, "lat" | "lng">, incident: Incident): number {
  if (me.lat == null || me.lng == null) return 9999;
  if (incident.lat != null && incident.lng != null) {
    return Math.round(kmBetween(me.lat, me.lng, incident.lat, incident.lng) * 10) / 10;
  }
  return 9999;
}

export function isRecommendedFor(incident: Incident, email: string, kind: SupportKind): boolean {
  const mine = email.trim().toLowerCase();
  const nearestMine = incident.nearest?.filter((n) => n.kind === kind).sort((a, b) => a.km - b.km)[0];
  if (nearestMine) return nearestMine.email.toLowerCase() === mine;
  return incident.nearest?.[0]?.email.toLowerCase() === mine;
}
