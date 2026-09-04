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
  { id: "W5", name: "Ward 5 Ajithsingh Nagar", x: 32, y: 74 },
  { id: "W7", name: "Ward 7 Governorpet", x: 48, y: 42 },
  { id: "W9", name: "Ward 9 Patamata", x: 68, y: 38 },
  { id: "W11", name: "Ward 11 Bhavanipuram", x: 22, y: 28 },
  { id: "W12", name: "Ward 12 Satyanarayanapuram", x: 40, y: 22 },
  { id: "W14", name: "Ward 14 Gunadala", x: 78, y: 24 },
  { id: "W19", name: "Ward 19 Autonagar", x: 82, y: 58 },
  { id: "HOSP", name: "GGH Hospital", x: 54, y: 52 },
  { id: "SH-B", name: "Shelter B Kanaka", x: 36, y: 54 },
  { id: "SUB", name: "33kV Substation", x: 62, y: 30 },
];

export const ROADS: Road[] = [
  { id: "NH16", name: "NH-16 corridor", from: "W19", to: "W9" },
  { id: "PRAKASAM", name: "Prakasam barrage road", from: "W3", to: "W7" },
  { id: "KANAKA", name: "Kanakadurga flyover", from: "W7", to: "HOSP" },
  { id: "ELURU", name: "Eluru Road", from: "W12", to: "W14" },
  { id: "BANDAR", name: "Bandar Road", from: "HOSP", to: "W9" },
  { id: "PUMP", name: "Canal service road", from: "SH-B", to: "W5" },
];

export function wardById(id: string): Ward {
  return WARDS.find((w) => w.id === id) ?? WARDS[0];
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
