export type Ward = {
  id: string;
  name: string;
  x: number;
  y: number;
};

export type Road = {
  id: string;
  name: string;
  from: string;
  to: string;
};

export const WARDS: Ward[] = [
  { id: "W3", name: "Ward 3 Krishnalanka", x: 18, y: 62 },
  { id: "W4", name: "Ward 4 Island colony", x: 12, y: 70 },
  { id: "W5", name: "Ward 5 Ajithsingh Nagar", x: 32, y: 74 },
  { id: "W7", name: "Ward 7 Governorpet", x: 48, y: 42 },
  { id: "W8", name: "Ward 8 Riverfront", x: 28, y: 48 },
  { id: "W9", name: "Ward 9 Patamata", x: 68, y: 38 },
  { id: "W11", name: "Ward 11 Bhavanipuram", x: 22, y: 28 },
  { id: "W12", name: "Ward 12 Satyanarayanapuram", x: 40, y: 22 },
  { id: "W14", name: "Ward 14 Gunadala", x: 78, y: 24 },
  { id: "W15", name: "Ward 15 Tadepalli", x: 44, y: 58 },
  { id: "W17", name: "Ward 17 Tenali canal belt", x: 58, y: 78 },
  { id: "W19", name: "Ward 19 Autonagar", x: 82, y: 58 },
  { id: "W21", name: "Ward 21 Guntur old town", x: 8, y: 36 },
  { id: "HOSP", name: "GGH Hospital Vijayawada", x: 54, y: 52 },
  { id: "SH-B", name: "Shelter B Kanaka", x: 36, y: 54 },
  { id: "SH-C", name: "Shelter C Tenali", x: 70, y: 82 },
  { id: "SUB", name: "33kV Substation", x: 62, y: 30 },
];

export const ROADS: Road[] = [
  { id: "NH16", name: "NH-16 corridor", from: "W19", to: "W9" },
  { id: "PRAKASAM", name: "Prakasam barrage road", from: "W3", to: "W7" },
  { id: "KANAKA", name: "Kanakadurga flyover", from: "W7", to: "HOSP" },
  { id: "ELURU", name: "Eluru Road", from: "W12", to: "W14" },
  { id: "BANDAR", name: "Bandar Road", from: "HOSP", to: "W9" },
  { id: "PUMP", name: "Canal service road", from: "SH-B", to: "W5" },
  { id: "TENALI", name: "Tenali canal bund", from: "W17", to: "SH-C" },
  { id: "GNT", name: "Guntur–Mangalagiri road", from: "W21", to: "W15" },
];

const WARD_LL: Record<string, { lat: number; lng: number }> = {
  W3: { lat: 16.4982, lng: 80.6184 },
  W4: { lat: 16.4891, lng: 80.6048 },
  W5: { lat: 16.4814, lng: 80.642 },
  W7: { lat: 16.5186, lng: 80.6302 },
  W8: { lat: 16.511, lng: 80.615 },
  W9: { lat: 16.506, lng: 80.666 },
  W11: { lat: 16.532, lng: 80.605 },
  W12: { lat: 16.528, lng: 80.628 },
  W14: { lat: 16.52, lng: 80.678 },
  W15: { lat: 16.47, lng: 80.61 },
  W17: { lat: 16.2428, lng: 80.6405 },
  W19: { lat: 16.487, lng: 80.666 },
  W21: { lat: 16.3067, lng: 80.4365 },
  HOSP: { lat: 16.5174, lng: 80.6481 },
  "SH-B": { lat: 16.505, lng: 80.625 },
  "SH-C": { lat: 16.235, lng: 80.655 },
  SUB: { lat: 16.525, lng: 80.652 },
};

export function wardById(id: string): Ward {
  return WARDS.find((w) => w.id === id) ?? WARDS[0]!;
}

export function wardLatLng(id: string): { lat: number; lng: number } {
  if (WARD_LL[id]) return WARD_LL[id]!;
  const w = wardById(id);
  return {
    lat: 16.58 - (w.y / 90) * 0.34,
    lng: 80.4 + (w.x / 90) * 0.46,
  };
}

export function incidentLatLng(row: { lat?: number; lng?: number; locationId: string }): { lat: number; lng: number } {
  if (typeof row.lat === "number" && typeof row.lng === "number") return { lat: row.lat, lng: row.lng };
  return wardLatLng(row.locationId);
}

export function travelMinutes(fromId: string, toId: string, blocked: Set<string>): number {
  const a = wardById(fromId);
  const b = wardById(toId);
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  let mins = Math.max(6, Math.round(dist * 0.55));
  const touching = ROADS.filter(
    (r) =>
      blocked.has(r.id) &&
      (r.from === fromId || r.to === fromId || r.from === toId || r.to === toId),
  );
  if (touching.length) mins += 14 * touching.length;
  return mins;
}

export function roadsOnPath(fromId: string, toId: string): string[] {
  return ROADS.filter(
    (r) =>
      (r.from === fromId && r.to === toId) ||
      (r.to === fromId && r.from === toId) ||
      r.from === fromId ||
      r.to === toId ||
      r.from === toId ||
      r.to === fromId,
  )
    .slice(0, 2)
    .map((r) => r.id);
}
