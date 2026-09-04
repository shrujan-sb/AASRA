import { kmBetween } from "@/lib/geoMath";
import type { ApprovedSupport, IncidentNear } from "@/lib/types";

export function rankNearestSupport(
  units: ApprovedSupport[],
  lat: number,
  lng: number,
  limit = 5,
): IncidentNear[] {
  return units
    .filter((u) => typeof u.lat === "number" && typeof u.lng === "number")
    .map((u) => ({
      email: u.email,
      name: u.name || u.email,
      orgName: u.orgName || u.name || (u.kind === "government" ? "Government" : "NGO / volunteer"),
      kind: u.kind,
      km: Math.round(kmBetween(lat, lng, u.lat!, u.lng!) * 10) / 10,
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}
