export type PolicyWeights = {
  lifeSafety: number;
  medical: number;
  shelter: number;
  logistics: number;
};

export const DEFAULT_POLICY: PolicyWeights = {
  lifeSafety: 100,
  medical: 72,
  shelter: 40,
  logistics: 18,
};

const LIFE = ["evac", "rescue", "drown", "trapped", "collapse", "boat", "nurse", "ambulance"];
const MED = ["medical", "hospital", "doctor", "nurse", "blood", "trauma", "power", "generator", "icu"];
const SHELTER = ["shelter", "blanket", "water", "food", "tanker", "ration"];

export function categoryFor(resource: string, raw: string): keyof PolicyWeights {
  const t = `${resource} ${raw}`.toLowerCase();
  if (LIFE.some((k) => t.includes(k))) return "lifeSafety";
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
  const qty = Math.min(80, Math.log10(Math.max(1, input.quantity) + 1) * 28);
  return Math.round(base + qty + input.urgencySignal * 12 - input.verificationPenalty);
}
