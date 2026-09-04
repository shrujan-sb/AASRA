import type { Severity } from "@/lib/types";

export type PolicyWeights = {
  lifeSafety: number;
  medical: number;
  shelter: number;
  logistics: number;
};

export const DEFAULT_POLICY: PolicyWeights = {
  lifeSafety: 100,
  medical: 70,
  shelter: 32,
  logistics: 16,
};

const LIFE = ["evac", "rescue", "drown", "trapped", "collapse", "rooftop", "ambulance", "dying"];
const MED = ["medical", "hospital", "doctor", "nurse", "blood", "trauma", "icu", "fever", "injured"];
const SHELTER = ["shelter", "blanket", "water", "food", "tanker", "ration"];

export function categoryFor(resource: string, raw: string): keyof PolicyWeights {
  const t = `${resource} ${raw}`.toLowerCase();
  const lifeBoat = /\bboat/.test(t) && /\b(evac|rescue|trapped|rooftop|drown)/.test(t);
  if (LIFE.some((k) => t.includes(k)) || lifeBoat) return "lifeSafety";
  if (MED.some((k) => t.includes(k))) return "medical";
  if (SHELTER.some((k) => t.includes(k))) return "shelter";
  return "logistics";
}

export function scoreNeed(
  policy: PolicyWeights,
  input: { resource: string; raw: string; quantity: number; urgencySignal: number; verificationPenalty: number },
): number {
  const cat = categoryFor(input.resource, input.raw);
  const base = policy[cat];
  const qty = Math.min(22, Math.log10(Math.max(1, input.quantity) + 1) * 12);
  return Math.round(base + qty + input.urgencySignal * 11 - input.verificationPenalty);
}

export function severityFromScore(
  score: number,
  urgencySignal: number,
  resource: string,
  raw: string,
): Severity {
  const cat = categoryFor(resource, raw);
  if (cat === "lifeSafety" && urgencySignal >= 8) return "critical";
  if (score >= 175) return "critical";
  if (score >= 118 || (cat === "medical" && urgencySignal >= 6)) return "high";
  return "normal";
}
