import type { InboxMessage, Lang, StructuredEvent } from "@/lib/types";
import { WARDS } from "@/lib/geo";

const RESOURCE_MAP: { keys: string[]; resource: string }[] = [
  { keys: ["blanket", "कंबल", "బ్లాంకెట్"], resource: "blankets" },
  { keys: ["nurse", "नर्स", "నర్స్"], resource: "nurses" },
  { keys: ["doctor", "चिकित्सक", "వైద్యుడు", "medical"], resource: "medical staff" },
  { keys: ["boat", "नाव", "పడవ"], resource: "boats" },
  { keys: ["tanker", "water", "पानी", "నీరు"], resource: "water tankers" },
  { keys: ["generator", "power", "बिजली", "విద్యుత్"], resource: "generators" },
  { keys: ["food", "ration", "खाना", "ఆహారం"], resource: "food kits" },
  { keys: ["truck", "lorry", "ट्रक"], resource: "trucks" },
  { keys: ["ambulance"], resource: "ambulances" },
  { keys: ["evac", "rescue", "trapped"], resource: "flood-rescue team" },
];

function detectLang(text: string): Lang {
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

function locationOf(text: string): { id: string; label: string } {
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
  if (/blocked|open|collapsed|restored|hazard|bridge|road/i.test(text) && !/need|require/i.test(text)) {
    return "hazard_report";
  }
  if (/have|available|free|offering|can send|standing by/i.test(text)) return "offer";
  return "request";
}

function urgency(text: string): number {
  if (/critical|dying|drown|immediate|now|life/i.test(text)) return 9;
  if (/urgent|asap|need 2 nurses|evac/i.test(text)) return 7;
  if (/shortage|soon/i.test(text)) return 4;
  return 2;
}

function hazardStatus(text: string): StructuredEvent["hazardStatus"] {
  if (/open|cleared|restored|passable/i.test(text)) return "open";
  if (/blocked|closed|collapsed|impassable/i.test(text)) return "blocked";
  return "unknown";
}

function subjectKey(text: string, locId: string, resource: string): string {
  if (/prakasam|barrage/i.test(text)) return "road:PRAKASAM";
  if (/nh-?16/i.test(text)) return "road:NH16";
  if (/kanaka/i.test(text)) return "road:KANAKA";
  if (/eluru/i.test(text)) return "road:ELURU";
  return `${locId}:${resource}`;
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
    const out: IntakeOutput = {
      id: msg.id,
      type: typeOf(msg.rawText),
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
      translated:
        language === "en"
          ? msg.rawText
          : `[${language.toUpperCase()}→EN] ${msg.rawText}`,
      subjectKey: subjectKey(msg.rawText, loc.id, resource),
      hazardStatus: typeOf(msg.rawText) === "hazard_report" ? hazardStatus(msg.rawText) : undefined,
    };
    this.memory.set(out.id, out);
    return out;
  },
};
