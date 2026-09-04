import { ROADS, WARDS, wardById } from "@/lib/geo";
import type {
  BeforeBrief,
  Hazard,
  Incident,
  PrepAssetKind,
  PrepMove,
  PrepVulnerable,
  PrepositionPlan,
  PrepSite,
  ResourceAsset,
  VulnerableMap,
} from "@/lib/types";

export type WardProfile = {
  id: string;
  city: "Vijayawada" | "Guntur" | "Tenali";
  terrain: string;
  population: number;
  history: string;
  rainfallNote: string;
};

export type CriticalSite = {
  id: string;
  kind: PrepAssetKind;
  name: string;
  wardId: string;
  note: string;
};

export const WARD_PROFILES: WardProfile[] = [
  { id: "W3", city: "Vijayawada", terrain: "river island, clay, few exits", population: 18400, history: "Krishnalanka overtopped in 2009 and 2020", rainfallNote: "backwater from Prakasam barrage" },
  { id: "W4", city: "Vijayawada", terrain: "lowest island colony, katcha lanes", population: 9200, history: "rooftop evac twice last decade", rainfallNote: "ponds on both sides" },
  { id: "W5", city: "Vijayawada", terrain: "drain outfall, dense housing", population: 22100, history: "Ajithsingh Nagar canal breach 2016", rainfallNote: "storm drain surcharge" },
  { id: "W7", city: "Vijayawada", terrain: "raised commercial core", population: 16800, history: "street flooding only", rainfallNote: "short ponding on Eluru Road" },
  { id: "W8", city: "Vijayawada", terrain: "Krishna riverfront bund", population: 14300, history: "bund seep 2022", rainfallNote: "river stage + overnight rain" },
  { id: "W9", city: "Vijayawada", terrain: "mixed, Bandar Road high ground", population: 19500, history: "Patamata underpass floods", rainfallNote: "underpass pumps lag" },
  { id: "W11", city: "Vijayawada", terrain: "north bank, some fill", population: 17200, history: "Bhavanipuram tank overflow", rainfallNote: "local tank + canal" },
  { id: "W12", city: "Vijayawada", terrain: "rail corridor, slightly raised", population: 15100, history: "few flood deaths on file", rainfallNote: "sheet flow from Gunadala hill" },
  { id: "W14", city: "Vijayawada", terrain: "foothill, better drain", population: 12800, history: "landslide debris 2018, not river", rainfallNote: "runoff, not inundation" },
  { id: "W15", city: "Guntur", terrain: "Tadepalli low fields, NH-16 dip", population: 24600, history: "fields under water 2020", rainfallNote: "Krishna right-bank spill" },
  { id: "W17", city: "Tenali", terrain: "canal belt, paddy, no high ground", population: 26800, history: "Tenali canal overtop 2009, 2016, 2020", rainfallNote: "48h rain on saturated paddy plus canal release" },
  { id: "W19", city: "Vijayawada", terrain: "industrial Autonagar, NH-16", population: 13400, history: "yard flooding, trucks stranded", rainfallNote: "bund seepage + drain block" },
  { id: "W21", city: "Guntur", terrain: "old town, clogged nala", population: 31200, history: "Guntur nala overflow 2016", rainfallNote: "urban nala + high population" },
  { id: "HOSP", city: "Vijayawada", terrain: "campus on slight rise", population: 2400, history: "access roads cut 2020", rainfallNote: "campus dry, approaches wet" },
  { id: "SH-B", city: "Vijayawada", terrain: "Kanaka shelter, mid ground", population: 800, history: "overflow camp 2020", rainfallNote: "intake from W3/W5" },
  { id: "SH-C", city: "Tenali", terrain: "school-turned-shelter, canal side", population: 600, history: "opened 2020, water at gate", rainfallNote: "same belt as W17" },
  { id: "SUB", city: "Vijayawada", terrain: "33kV yard, Eluru Road", population: 40, history: "feeder trip in heavy rain", rainfallNote: "yard flooding knocks pumps" },
];

export const CRITICAL_SITES: CriticalSite[] = [
  { id: "SCH-TNL", kind: "school", name: "ZPHS Tenali canal", wardId: "W17", note: "ground floor classrooms, 640 pupils" },
  { id: "SCH-KRL", kind: "school", name: "Municipal school Krishnalanka", wardId: "W3", note: "single-storey, used as overflow camp" },
  { id: "SCH-GNT", kind: "school", name: "Municipal high school Guntur old town", wardId: "W21", note: "nala behind compound" },
  { id: "HOSP-GGH", kind: "hospital", name: "GGH Vijayawada", wardId: "HOSP", note: "trauma and dialysis; Bandar Road access" },
  { id: "HOSP-TNL", kind: "hospital", name: "Government hospital Tenali", wardId: "W17", note: "OT on ground floor" },
  { id: "HOSP-GNT", kind: "hospital", name: "GGH Guntur", wardId: "W21", note: "inpatient 480; nala flood cuts west gate" },
  { id: "ELD-KRL", kind: "elderly", name: "Old-age home Krishnalanka", wardId: "W3", note: "62 residents, many non-ambulant" },
  { id: "ELD-TNL", kind: "elderly", name: "Seva ashram Tenali", wardId: "W17", note: "41 residents, one nurse at night" },
  { id: "ELD-TDP", kind: "elderly", name: "Ashram Tadepalli", wardId: "W15", note: "fields on three sides" },
  { id: "RD-PRAK", kind: "road", name: "Prakasam barrage road", wardId: "W3", note: "only island exit west" },
  { id: "RD-NH", kind: "road", name: "NH-16 Autonagar dip", wardId: "W19", note: "lorries stall; blocks relief from east" },
  { id: "RD-TNL", kind: "road", name: "Tenali canal bund road", wardId: "W17", note: "carriageway overtopped in 2020" },
  { id: "RD-GNT", kind: "road", name: "Guntur–Mangalagiri road", wardId: "W21", note: "nala cross-drain" },
  { id: "SUB-33", kind: "substation", name: "33kV Eluru Road yard", wardId: "SUB", note: "feeds hospital pumps and city signals" },
  { id: "SUB-TNL", kind: "substation", name: "11kV Tenali feeder", wardId: "W17", note: "yard at canal level" },
  { id: "SH-KAN", kind: "shelter", name: "Shelter B Kanaka", wardId: "SH-B", note: "capacity 900; water stores 36h" },
  { id: "SH-TNL", kind: "shelter", name: "Shelter C Tenali", wardId: "SH-C", note: "capacity 500; gate floods first" },
];

export function sectorContextText(): string {
  const wards = WARD_PROFILES.map(
    (p) =>
      `${p.id} ${wardById(p.id).name} · ${p.city} · pop ${p.population} · ${p.terrain} · history: ${p.history} · weather: ${p.rainfallNote}`,
  ).join("\n");
  const sites = CRITICAL_SITES.map((s) => `${s.kind} | ${s.name} @ ${s.wardId} — ${s.note}`).join("\n");
  const roads = ROADS.map((r) => `${r.id} ${r.name} ${r.from}->${r.to}`).join("; ");
  return `Krishna delta sector (Vijayawada / Guntur / Tenali). Cyclone + monsoon rain, 24–48h window.

WARDS:
${wards}

CRITICAL SITES:
${sites}

ROADS: ${roads}`;
}

export function isBoat(r: ResourceAsset): boolean {
  return r.equipment.some((e) => /boat/i.test(e)) || r.skills.some((s) => /boat/i.test(s));
}

export function isMed(r: ResourceAsset): boolean {
  return r.kind === "medical" || r.skills.some((s) => /nurse|doctor|medic/i.test(s));
}

export function isTanker(r: ResourceAsset): boolean {
  return r.equipment.some((e) => /tanker|water/i.test(e)) || r.skills.includes("water");
}

export function unitRole(r: ResourceAsset): "boat" | "medical" | "tanker" | "other" {
  if (isBoat(r)) return "boat";
  if (isMed(r)) return "medical";
  if (isTanker(r)) return "tanker";
  return "other";
}

function wardFromIncident(i: Incident): string | null {
  if (WARDS.some((w) => w.id === i.locationId)) return i.locationId;
  const label = `${i.locationLabel} ${i.title} ${i.resource}`.toLowerCase();
  if (/tenali/.test(label)) return "W17";
  if (/tadepalli/.test(label)) return "W15";
  if (/autonagar/.test(label)) return "W19";
  if (/guntur/.test(label)) return "W21";
  if (/krishnalanka|prasadampadu/.test(label)) return "W3";
  if (/vijayawada|bandar|eluru road/.test(label)) return "W8";
  const hit = WARDS.find((w) => label.includes(w.name.toLowerCase()));
  return hit?.id ?? null;
}

function scoreWard(id: string, hazards: Hazard[], incidents: Incident[]): number {
  const p = WARD_PROFILES.find((w) => w.id === id);
  let n = 0;
  if (p?.city === "Tenali") n += 40;
  if (p?.id === "W17" || p?.id === "W3" || p?.id === "W4") n += 36;
  if (p?.id === "W5" || p?.id === "W15" || p?.id === "W8") n += 22;
  if (p && p.population > 20000) n += 10;
  if (/canal|island|nala|paddy|lowest/i.test(p?.terrain ?? "")) n += 16;
  if (hazards.some((h) => h.status === "blocked" && (h.roadId === id || h.label.includes(p?.city ?? "___")))) n += 18;
  for (const i of incidents) {
    if (i.status === "resolved") continue;
    if (i.locationId === id) n += 12;
    const ward = wardFromIncident(i);
    if (ward === id) n += 14;
    if (i.severity === "critical" && (i.locationId === id || ward === id)) n += 20;
    if (/trap|boat|medic|water|blanket/i.test(`${i.title} ${i.resource}`) && ward === id) n += 6;
  }
  return n;
}

const STAGE_DESTS = ["W17", "W3", "W15", "SH-C"] as const;

function stageDestinations(incidents: Incident[]): string[] {
  const open = incidents.filter((i) => i.status !== "resolved");
  const fromCitizens = open
    .map((i) => wardFromIncident(i))
    .filter((id): id is string => Boolean(id));
  if (fromCitizens.length) {
    return [...new Set(fromCitizens)].filter((id) => WARDS.some((w) => w.id === id)).slice(0, 4);
  }
  return [...STAGE_DESTS].filter((id) => WARDS.some((w) => w.id === id));
}

export function fallbackPreposition(input: {
  resources: ResourceAsset[];
  incidents?: Incident[];
  hazards?: Hazard[];
}): PrepositionPlan {
  const incidents = input.incidents ?? [];
  const dests = stageDestinations(incidents);
  const topCitizen = incidents.filter((i) => i.status !== "resolved").slice(0, 3);
  const citizenLine = topCitizen.length
    ? `Citizen queue points staging toward ${topCitizen.map((i) => i.locationLabel).join(", ")}.`
    : "";
  const free = input.resources.filter((r) => r.status === "free");
  const boats = free.filter(isBoat);
  const meds = free.filter(isMed);
  const tanks = free.filter(isTanker);
  const nBoats = Math.min(4, boats.length);
  const nMed = Math.min(2, meds.length);
  const nTank = Math.min(3, tanks.length);
  const pick = [
    ...boats.slice(0, nBoats).map((r, i) => ({ r, to: dests[i % dests.length]!, tag: "rescue boat" as const })),
    ...meds.slice(0, nMed).map((r, i) => ({ r, to: i === 0 ? "W17" : "HOSP", tag: "medical team" as const })),
    ...tanks.slice(0, nTank).map((r, i) => ({ r, to: dests[(i + 1) % dests.length]!, tag: "water tanker" as const })),
  ];
  const moves: PrepMove[] = pick
    .filter((m) => m.r.locationId !== m.to)
    .map((m) => ({
      resourceId: m.r.id,
      callsign: m.r.callsign,
      fromId: m.r.locationId,
      toId: m.to,
      toLabel: wardById(m.to).name,
      why:
        topCitizen[0] && m.to === wardFromIncident(topCitizen[0])
          ? `Stage for ${topCitizen[0].resource} at ${topCitizen[0].locationLabel}.`
          : `Stage ${m.tag} before the canal belt and island cut out.`,
    }));
  const sites: PrepSite[] = dests.map((id) => ({
    id,
    label: wardById(id).name,
    why:
      id === "W17"
        ? "Canal belt saturates first; boats and a medical cell here cover Tenali."
        : id === "W3"
          ? "Island colony loses the barrage road; park boats on the west bank."
          : id === "W15"
            ? "Tadepalli fields take Krishna spill; tanker on the NH-16 dip."
            : "Shelter C gate floods; water store before night.",
  }));
  const named = dests.map((id) => wardById(id).name).join(", ");
  return {
    headline: topCitizen.length
      ? `Preplan from ${topCitizen.length} citizen ticket(s): stage boats, med, and water toward ${named}.`
      : `Stage ${nBoats} boats, ${nMed} medical teams and ${nTank} tankers on the canal belt before landfall.`,
    orders: `${citizenLine} Before the cyclone arrives, move ${nBoats} rescue boats, ${nMed} medical teams and ${nTank} water tankers to ${named}.`.trim(),
    boats: nBoats,
    medical: nMed,
    tankers: nTank,
    sites,
    moves,
    fallback: true,
  };
}

export function coercePreposition(raw: Record<string, unknown>, fallback: PrepositionPlan, resources: ResourceAsset[]): PrepositionPlan {
  const known = new Map(resources.map((r) => [r.id, r]));
  const moves = Array.isArray(raw.moves)
    ? raw.moves
        .slice(0, 20)
        .map((row) => {
          const r = (row ?? {}) as Record<string, unknown>;
          const resourceId = String(r.resourceId ?? "");
          const unit = known.get(resourceId);
          if (!unit || unit.status !== "free") return null;
          const toId = String(r.toId ?? "");
          if (!toId) return null;
          return {
            resourceId,
            callsign: String(r.callsign ?? unit.callsign),
            fromId: String(r.fromId ?? unit.locationId),
            toId,
            toLabel: String(r.toLabel ?? wardById(toId).name),
            why: String(r.why ?? "").trim() || "Stage before landfall.",
          } satisfies PrepMove;
        })
        .filter((m): m is PrepMove => Boolean(m))
    : fallback.moves;
  const sites = Array.isArray(raw.sites)
    ? raw.sites
        .slice(0, 8)
        .map((row) => {
          const r = (row ?? {}) as Record<string, unknown>;
          const id = String(r.id ?? r.toId ?? "");
          if (!id) return null;
          return {
            id,
            label: String(r.label ?? r.toLabel ?? wardById(id).name),
            why: String(r.why ?? "").trim(),
          } satisfies PrepSite;
        })
        .filter((s): s is PrepSite => Boolean(s))
    : fallback.sites;
  const count = (role: "boat" | "medical" | "tanker", key: string, fb: number) => {
    const n = raw[key];
    if (typeof n === "number" && n >= 0) return Math.round(n);
    return moves.filter((m) => {
      const u = known.get(m.resourceId);
      return u ? unitRole(u) === role : false;
    }).length || fb;
  };
  const boats = count("boat", "boats", fallback.boats);
  const medical = count("medical", "medical", fallback.medical);
  const tankers = count("tanker", "tankers", fallback.tankers);
  const orders = String(raw.orders ?? fallback.orders).trim() || fallback.orders;
  const headline = String(raw.headline ?? fallback.headline).trim() || fallback.headline;
  return {
    headline,
    orders,
    boats,
    medical,
    tankers,
    sites: sites.length ? sites : fallback.sites,
    moves: moves.length ? moves : fallback.moves,
    fallback: false,
  };
}

export function fallbackBrief(input: {
  resources: ResourceAsset[];
  incidents?: Incident[];
  hazards?: Hazard[];
}): BeforeBrief {
  const incidents = input.incidents ?? [];
  const hazards = input.hazards ?? [];
  const ranked = [...WARDS]
    .map((w) => ({ w, score: scoreWard(w.id, hazards, incidents) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 5);
  const high = top[0]?.w ?? WARDS[0];
  const staging = fallbackPreposition(input);

  const risks: BeforeBrief["risks"] = top.map((row, i) => {
    const p = WARD_PROFILES.find((x) => x.id === row.w.id);
    const level = i === 0 ? "high" : i < 3 ? "elevated" : "watch";
    return {
      wardId: row.w.id,
      wardName: row.w.name,
      level,
      horizonHours: i === 0 ? 36 : 48,
      blurb: `${row.w.name} has ${level === "high" ? "unusually high" : level} flood risk over the next ${i === 0 ? "24–48" : "48"} hours.`,
      drivers: [
        p?.rainfallNote ?? "rainfall",
        p?.terrain ?? "terrain",
        p?.history ?? "history",
        p ? `population ${p.population}` : "population",
      ],
    };
  });

  const hot = new Set(top.slice(0, 4).map((r) => r.w.id));
  hot.add("W17");
  const vulnerable = CRITICAL_SITES.filter((s) => hot.has(s.wardId) || s.wardId === "SUB").map((s) => ({
    kind: s.kind,
    name: s.name,
    wardId: s.wardId,
    why: s.note,
    action:
      s.kind === "shelter"
        ? "Stage water and check gate height before night."
        : s.kind === "hospital"
          ? "Keep one dry approach open; park a medical cell on the rise."
          : s.kind === "elderly"
            ? "List non-ambulant residents; boat-ready by dusk."
            : s.kind === "school"
              ? "Cancel ground-floor use; move registers upstairs."
              : s.kind === "substation"
                ? "Sandbag the yard; protect hospital feeder."
                : "Close if overtopped; mark a detour on the desk.",
  }));

  return {
    headline: `${high.name} has unusually high flood risk over the next 24–48 hours.`,
    windowHours: 48,
    orders: staging.orders,
    risks,
    vulnerable,
    moves: staging.moves,
    fallback: true,
  };
}

export function coerceBrief(raw: Record<string, unknown>, fallback: BeforeBrief): BeforeBrief {
  const level = (v: unknown): "high" | "elevated" | "watch" =>
    v === "high" || v === "elevated" || v === "watch" ? v : "elevated";
  const kinds = new Set<PrepAssetKind>(["school", "hospital", "elderly", "road", "substation", "shelter"]);
  const risks = Array.isArray(raw.risks)
    ? raw.risks.slice(0, 8).map((row) => {
        const r = (row ?? {}) as Record<string, unknown>;
        const wardId = String(r.wardId ?? "");
        const name = WARDS.find((w) => w.id === wardId)?.name ?? String(r.wardName ?? wardId);
        return {
          wardId,
          wardName: name,
          level: level(r.level),
          horizonHours: typeof r.horizonHours === "number" ? r.horizonHours : 48,
          blurb: String(r.blurb ?? ""),
          drivers: Array.isArray(r.drivers) ? r.drivers.map(String).slice(0, 6) : [],
        };
      })
    : fallback.risks;
  const vulnerable = Array.isArray(raw.vulnerable)
    ? raw.vulnerable.slice(0, 16).map((row) => {
        const r = (row ?? {}) as Record<string, unknown>;
        const kind = kinds.has(r.kind as PrepAssetKind) ? (r.kind as PrepAssetKind) : "shelter";
        return {
          kind,
          name: String(r.name ?? ""),
          wardId: String(r.wardId ?? ""),
          why: String(r.why ?? ""),
          action: String(r.action ?? ""),
        };
      })
    : fallback.vulnerable;
  const moves = Array.isArray(raw.moves)
    ? raw.moves.slice(0, 16).map((row) => {
        const r = (row ?? {}) as Record<string, unknown>;
        const toId = String(r.toId ?? "");
        return {
          resourceId: String(r.resourceId ?? ""),
          callsign: String(r.callsign ?? r.resourceId ?? ""),
          fromId: String(r.fromId ?? ""),
          toId,
          toLabel: String(r.toLabel ?? wardById(toId).name),
          why: String(r.why ?? ""),
        };
      })
    : fallback.moves;
  const headline = String(raw.headline ?? fallback.headline).trim() || fallback.headline;
  return {
    headline,
    windowHours: typeof raw.windowHours === "number" ? raw.windowHours : 48,
    orders: String(raw.orders ?? fallback.orders).trim() || fallback.orders,
    risks: risks.filter((r) => r.wardId && r.blurb),
    vulnerable: vulnerable.filter((v) => v.name),
    moves: moves.filter((m) => m.resourceId && m.toId),
    fallback: false,
  };
}

export const PREP_KINDS: PrepAssetKind[] = ["school", "hospital", "elderly", "road", "substation", "shelter"];

function siteAction(kind: PrepAssetKind): string {
  if (kind === "shelter") return "Stage water and check gate height before night.";
  if (kind === "hospital") return "Keep one dry approach open; park a medical cell on the rise.";
  if (kind === "elderly") return "List non-ambulant residents; boat-ready by dusk.";
  if (kind === "school") return "Cancel ground-floor use; move registers upstairs.";
  if (kind === "substation") return "Sandbag the yard; protect hospital feeder.";
  return "Close if overtopped; mark a detour on the desk.";
}

function toVulnerable(s: CriticalSite): PrepVulnerable {
  return { kind: s.kind, name: s.name, wardId: s.wardId, why: s.note, action: siteAction(s.kind) };
}

export function fallbackVulnerable(input: { incidents?: Incident[]; hazards?: Hazard[] }): VulnerableMap {
  const incidents = input.incidents ?? [];
  const hazards = input.hazards ?? [];
  const ranked = [...WARDS]
    .map((w) => ({ w, score: scoreWard(w.id, hazards, incidents) }))
    .sort((a, b) => b.score - a.score);
  const hot = new Set(ranked.slice(0, 4).map((r) => r.w.id));
  hot.add("W17");
  const sites = CRITICAL_SITES.filter((s) => hot.has(s.wardId) || s.wardId === "SUB").map(toVulnerable);
  for (const kind of PREP_KINDS) {
    if (sites.some((s) => s.kind === kind)) continue;
    const extra = CRITICAL_SITES.find((s) => s.kind === kind);
    if (extra) sites.push(toVulnerable(extra));
  }
  return {
    headline: `If the flood comes, ${sites.length} sites take the first hit — schools, hospitals, elderly homes, roads, substations, and shelters.`,
    windowHours: 48,
    sites,
    fallback: true,
  };
}

export function coerceVulnerable(raw: Record<string, unknown>, fallback: VulnerableMap): VulnerableMap {
  const kinds = new Set<PrepAssetKind>(PREP_KINDS);
  const rawSites = Array.isArray(raw.sites) ? raw.sites : Array.isArray(raw.vulnerable) ? raw.vulnerable : null;
  const parsed = rawSites
    ? rawSites.slice(0, 24).map((row) => {
        const r = (row ?? {}) as Record<string, unknown>;
        const kind = kinds.has(r.kind as PrepAssetKind) ? (r.kind as PrepAssetKind) : "shelter";
        return {
          kind,
          name: String(r.name ?? "").trim(),
          wardId: String(r.wardId ?? "").trim(),
          why: String(r.why ?? "").trim(),
          action: String(r.action ?? "").trim() || siteAction(kind),
        };
      })
    : fallback.sites;
  const sites = parsed.filter((v) => v.name);
  const have = new Set(sites.map((s) => s.kind));
  for (const row of fallback.sites) {
    if (!have.has(row.kind)) {
      sites.push(row);
      have.add(row.kind);
    }
  }
  const headline = String(raw.headline ?? fallback.headline).trim() || fallback.headline;
  const windowHours = typeof raw.windowHours === "number" ? Math.min(48, Math.max(24, raw.windowHours)) : 48;
  return {
    headline,
    windowHours,
    sites: sites.length ? sites : fallback.sites,
    fallback: false,
  };
}
