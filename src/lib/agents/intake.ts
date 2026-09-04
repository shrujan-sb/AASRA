import type { InboxMessage, Lang, StructuredEvent } from "@/lib/types";
import { offerSubjectKey } from "@/lib/agents/offers";
import { ROADS, WARDS } from "@/lib/geo";

const RESOURCE_MAP: { keys: string[]; resource: string }[] = [
  { keys: ["blanket", "कंबल", "బ్లాంకెట్"], resource: "blankets" },
  { keys: ["nurse", "नर्स", "నర్స్"], resource: "nurses" },
  { keys: ["doctor", "चिकित्सक", "వైద్యుడు", "medical"], resource: "medical staff" },
  { keys: ["medicine", "tablet", "dawa", "दवा", "మందు"], resource: "medicine" },
  { keys: ["boat", "नाव", "పడవ"], resource: "boats" },
  { keys: ["tanker", "water", "पानी", "నీరు"], resource: "water tankers" },
  { keys: ["generator", "power", "बिजली", "విద్యుత్"], resource: "generators" },
  { keys: ["food", "ration", "खाना", "ఆహారం"], resource: "food kits" },
  { keys: ["truck", "lorry", "ट्रक"], resource: "trucks" },
  { keys: ["ambulance"], resource: "ambulances" },
  { keys: ["evac", "rescue", "trapped", "stuck", "stranded"], resource: "flood-rescue team" },
];

export type IntakeClerk = {
  type: StructuredEvent["type"];
  locationId: string;
  locationLabel: string;
  resource: string;
  quantity?: number;
  hazardStatus?: StructuredEvent["hazardStatus"];
  language?: Lang;
  translated?: string;
};

function detectLang(text: string): Lang {
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

function locationOf(text: string): { id: string; label: string } {
  const helpAt = text.match(/need help(?: in| at)?\s+([^:]+):/i);
  if (helpAt) {
    const label = helpAt[1]!.trim().replace(/\s*\[[-\d.]+,\s*[-\d.]+\]\s*$/, "");
    const ward = label.match(/ward\s*(\d+)/i);
    if (ward) {
      const hit = WARDS.find((w) => w.id === `W${ward[1]}` || w.name.toLowerCase().includes(`ward ${ward[1]}`));
      if (hit) return { id: hit.id, label: hit.name };
    }
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
    return { id: `LOC-${slug || "field"}`, label };
  }
  const ward = text.match(/ward\s*(\d+)/i);
  if (ward) {
    const hit = WARDS.find((w) => w.id === `W${ward[1]}` || w.name.toLowerCase().includes(`ward ${ward[1]}`));
    if (hit) return { id: hit.id, label: hit.name };
    return { id: `W${ward[1]}`, label: `Ward ${ward[1]}` };
  }
  const named = WARDS.find((w) => text.toLowerCase().includes(w.name.split(" ").slice(-1)[0]!.toLowerCase()));
  if (named) return { id: named.id, label: named.name };
  if (/bridge|barrage|prakasam/i.test(text)) return { id: "W3", label: "Prakasam barrage" };
  if (/hospital|ggh/i.test(text)) return { id: "HOSP", label: "GGH Hospital" };
  if (/shelter b/i.test(text)) return { id: "SH-B", label: "Shelter B Kanaka" };
  if (/substation/i.test(text)) return { id: "SUB", label: "33kV Substation" };
  if (/school/i.test(text)) return { id: "LOC-school", label: "School" };
  return { id: "W7", label: "Ward 7 Governorpet" };
}

function resourceOf(text: string): string {
  const t = text.toLowerCase();
  for (const row of RESOURCE_MAP) {
    if (row.keys.some((k) => t.includes(k.toLowerCase()))) return row.resource;
  }
  if (/bridge|road|flyover|blocked|open/i.test(text)) return "access";
  return "unspecified aid";
}

function quantityOf(text: string): number {
  const m = text.match(/(\d+)\s*(blankets|nurses|trucks|boats|kits|people|families)?/i);
  return m ? Number(m[1]) : 1;
}

function typeOf(text: string): StructuredEvent["type"] {
  if (/blocked|open|collapsed|restored|hazard|bridge|road/i.test(text) && !/need|require|stuck|stranded/i.test(text)) {
    return "hazard_report";
  }
  if (/have|available|free|offering|can send|standing by/i.test(text)) return "offer";
  return "request";
}

function urgency(text: string): number {
  const t = text.toLowerCase();
  if (/\b(drown|drowning|dying|trapped|rooftop|collapse|life[- ]?threatening)\b/.test(t)) return 10;
  if (/\b(evac|rescue|ambulance|critical|asap)\b/.test(t) || /\bnow\b/.test(t)) return 8;
  if (/\b(urgent|injured|fever|medical camp|nurse)\b/.test(t)) return 6;
  if (/\b(shortage|tonight|soon)\b/.test(t)) return 4;
  if (/\b(blanket|blankets|food|ration|water)\b/.test(t)) return 2;
  return 3;
}

function hazardStatus(text: string): StructuredEvent["hazardStatus"] {
  if (/open|cleared|restored|passable/i.test(text)) return "open";
  if (/blocked|closed|collapsed|impassable/i.test(text)) return "blocked";
  return "unknown";
}

function subjectKey(text: string, locId: string, resource: string): string {
  const roadHit = ROADS.find(
    (r) => r.id === locId || locId === `road:${r.id}` || locId.toUpperCase() === r.id,
  );
  if (roadHit) return `road:${roadHit.id}`;
  if (/prakasam|barrage/i.test(text)) return "road:PRAKASAM";
  if (/nh-?16/i.test(text)) return "road:NH16";
  if (/kanaka/i.test(text)) return "road:KANAKA";
  if (/eluru/i.test(text)) return "road:ELURU";
  return `${locId}:${resource}`;
}

function resolveLocation(id: string, label: string): { id: string; label: string } {
  const needleId = id.trim();
  const needleLabel = label.trim();
  const ward = WARDS.find(
    (w) =>
      w.id.toLowerCase() === needleId.toLowerCase() ||
      w.name.toLowerCase() === needleLabel.toLowerCase() ||
      needleLabel.toLowerCase().includes(w.name.toLowerCase()),
  );
  if (ward) return { id: ward.id, label: ward.name };
  const road = ROADS.find(
    (r) =>
      r.id.toLowerCase() === needleId.toLowerCase() ||
      needleId.toLowerCase() === `road:${r.id.toLowerCase()}` ||
      r.name.toLowerCase() === needleLabel.toLowerCase() ||
      needleLabel.toLowerCase().includes(r.name.toLowerCase()),
  );
  if (road) return { id: road.from, label: road.name };
  if (needleId && needleLabel) {
    const slug = needleId.startsWith("LOC-")
      ? needleId
      : `LOC-${needleLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "field"}`;
    return { id: slug, label: needleLabel };
  }
  return locationOf(needleLabel || needleId);
}

function applyClerk(base: IntakeOutput, clerk: IntakeClerk | null): IntakeOutput {
  if (!clerk) return base;
  const loc =
    clerk.locationLabel.trim() || clerk.locationId.trim()
      ? resolveLocation(clerk.locationId, clerk.locationLabel)
      : { id: base.locationId, label: base.locationLabel };
  const resource = clerk.resource.trim() || base.resource;
  const type: StructuredEvent["type"] =
    clerk.type === "offer" || clerk.type === "hazard_report" || clerk.type === "request" ? clerk.type : base.type;
  const qty =
    typeof clerk.quantity === "number" && clerk.quantity > 0
      ? Math.max(1, Math.min(10000, Math.round(clerk.quantity)))
      : base.quantity;
  const text = clerk.translated?.trim() || base.translated;
  const language = clerk.language ?? base.language;
  const key =
    type === "offer" ? offerSubjectKey(loc.id, resource) : subjectKey(base.rawText, loc.id, resource);
  return {
    ...base,
    type,
    locationId: loc.id,
    locationLabel: loc.label,
    resource,
    quantity: qty,
    language,
    translated: text,
    subjectKey: key,
    hazardStatus: type === "hazard_report" ? clerk.hazardStatus ?? hazardStatus(base.rawText) : undefined,
  };
}

async function parseChaotic(msg: IntakeInput): Promise<IntakeClerk | null> {
  const { parseChaoticIntake, detectAndTranslate } = await import("@/lib/featherless");
  const clerk = await parseChaoticIntake({ rawText: msg.rawText, source: msg.source });
  if (clerk) {
    const { model: _model, ...rest } = clerk;
    return rest;
  }
  const lang = await detectAndTranslate(msg.rawText);
  if (!lang) return null;
  return {
    type: typeOf(msg.rawText),
    locationId: "",
    locationLabel: "",
    resource: "",
    language: lang.language,
    translated: lang.translated,
  };
}

export type IntakeInput = InboxMessage;
export type IntakeOutput = Omit<StructuredEvent, "verification" | "corroboration" | "stage" | "incidentId" | "assignmentId">;

export const IntakeAgent = {
  name: "intake" as const,
  memory: new Map<string, IntakeOutput>(),
  run(msg: IntakeInput): IntakeOutput {
    const language = msg.languageHint ?? detectLang(msg.rawText);
    const loc = locationOf(msg.rawText);
    const resource = resourceOf(msg.rawText);
    const kind = typeOf(msg.rawText);
    const out: IntakeOutput = {
      id: msg.id,
      type: kind,
      locationId: loc.id,
      locationLabel: loc.label,
      resource,
      quantity: quantityOf(msg.rawText),
      urgencySignal: urgency(msg.rawText),
      rawText: msg.rawText,
      timestamp: msg.timestamp,
      source: msg.source,
      sourceReliability: /control|ndrf|police|municipal/i.test(msg.source) ? 0.92 : 0.55,
      language,
      translated: msg.rawText,
      subjectKey:
        kind === "offer" ? offerSubjectKey(loc.id, resource) : subjectKey(msg.rawText, loc.id, resource),
      hazardStatus: kind === "hazard_report" ? hazardStatus(msg.rawText) : undefined,
    };
    this.memory.set(out.id, out);
    return out;
  },
  async runAsync(msg: IntakeInput): Promise<IntakeOutput> {
    const fallback = this.run(msg);
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msg),
        });
        const data = (await res.json()) as { ok?: boolean; parsed?: IntakeOutput };
        if (res.ok && data.ok && data.parsed?.id) {
          this.memory.set(data.parsed.id, data.parsed);
          return data.parsed;
        }
      } catch {
        return fallback;
      }
      return fallback;
    }
    const clerk = await parseChaotic(msg);
    const out = applyClerk(fallback, clerk);
    this.memory.set(out.id, out);
    return out;
  },
};
