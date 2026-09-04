import type { Severity } from "@/lib/types";

export type PolicyWeights = {
  lifeSafety: number;
  medical: number;
  shelter: number;
  logistics: number;
};

export type NeedCategory = keyof PolicyWeights;

/** Life-safety first. Volume (500 food) must not beat a small medevac. */
export const DEFAULT_POLICY: PolicyWeights = {
  lifeSafety: 186,
  medical: 124,
  shelter: 68,
  logistics: 26,
};

const LIFE = [
  "evac",
  "medevac",
  "rescue",
  "drown",
  "trapped",
  "collapse",
  "rooftop",
  "ambulance",
  "dying",
  "life-threatening",
  "life threatening",
];
const MED = ["medical", "hospital", "ggh", "doctor", "nurse", "blood", "trauma", "icu", "fever", "injured", "clinic"];
const SHELTER = ["shelter", "blanket", "water", "tanker", "drinking"];
const FOOD = ["food", "ration", "kitchen", "meal"];

export function categoryFor(resource: string, raw: string): NeedCategory {
  const t = `${resource} ${raw}`.toLowerCase();
  const lifeBoat = /\bboat/.test(t) && /\b(evac|rescue|trapped|rooftop|drown)/.test(t);
  if (LIFE.some((k) => t.includes(k)) || lifeBoat) return "lifeSafety";
  const hospitalPower =
    /\b(generator|power|mains|electric|backup)\b/.test(t) &&
    /\b(hospital|ggh|icu|blood|clinic|ot)\b/.test(t);
  if (hospitalPower || MED.some((k) => t.includes(k))) return "medical";
  if (FOOD.some((k) => t.includes(k)) && !/\b(water|tanker)\b/.test(t)) return "logistics";
  if (SHELTER.some((k) => t.includes(k))) return "shelter";
  return "logistics";
}

export function categoryRank(cat: NeedCategory): number {
  if (cat === "lifeSafety") return 4;
  if (cat === "medical") return 3;
  if (cat === "shelter") return 2;
  return 1;
}

function qtyBonus(cat: NeedCategory, quantity: number): number {
  const log = Math.log10(Math.max(1, quantity) + 1);
  if (cat === "lifeSafety") return Math.min(16, log * 10);
  if (cat === "medical") return Math.min(12, log * 5);
  if (cat === "shelter") return Math.min(12, log * 4);
  return Math.min(8, log * 2.4);
}

function urgencyBonus(cat: NeedCategory, urgencySignal: number): number {
  const u = Math.max(0, Math.min(10, urgencySignal));
  if (cat === "lifeSafety") return u * 5;
  if (cat === "medical") return u * 3.2;
  if (cat === "shelter") return u * 2;
  return u * 1.1;
}

export function scoreNeed(
  policy: PolicyWeights,
  input: { resource: string; raw: string; quantity: number; urgencySignal: number; verificationPenalty: number },
): number {
  const cat = categoryFor(input.resource, input.raw);
  const raw =
    policy[cat] +
    qtyBonus(cat, input.quantity) +
    urgencyBonus(cat, input.urgencySignal) -
    input.verificationPenalty;
  return Math.max(0, Math.min(250, Math.round(raw)));
}

export function explainNeed(
  resource: string,
  raw: string,
  quantity: number,
): string {
  const cat = categoryFor(resource, raw);
  if (cat === "lifeSafety") {
    return `Life-safety first: ${quantity} medevac / trapped people outrank bulk food and shelter stocks.`;
  }
  if (cat === "medical") {
    return "Hospital power and clinical need come after evac, before shelter water and food.";
  }
  if (cat === "shelter") {
    return "Shelter water is survival aid, not ahead of medevac or hospital power.";
  }
  return `Bulk logistics (${quantity} ${resource || "food"}) stays behind life-safety, hospital power, and water.`;
}

export function severityFromScore(
  score: number,
  urgencySignal: number,
  resource: string,
  raw: string,
): Severity {
  const cat = categoryFor(resource, raw);
  const t = `${resource} ${raw}`.toLowerCase();
  if (cat === "lifeSafety") return "critical";
  if (cat === "medical" && (urgencySignal >= 8 || /\b(icu|blood|ot)\b/.test(t))) return "critical";
  if (cat === "medical" || score >= 175) return "high";
  if (score >= 118 || (cat === "shelter" && urgencySignal >= 6)) return "high";
  return "normal";
}

export function clampPriorityScore(n: number): number {
  return Math.max(0, Math.min(250, Math.round(n)));
}
