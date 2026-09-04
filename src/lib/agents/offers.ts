import { WARDS } from "@/lib/geo";

export type OfferFields = {
  type: "offer";
  resource: string;
  quantity: number;
  locationId: string;
  locationLabel: string;
};

const OFFER_HINT =
  /\b(have|has|having|available|free|offering|offer|can send|standing by|can deploy|can move|onboard)\b/i;

const OFFER_RESOURCES: { keys: string[]; resource: string }[] = [
  { keys: ["truck", "lorry", "ट्रक"], resource: "trucks" },
  { keys: ["boat", "नाव", "పడవ"], resource: "boats" },
  { keys: ["ambulance"], resource: "ambulances" },
  { keys: ["tanker", "water", "पानी", "నీరు"], resource: "water tankers" },
  { keys: ["generator"], resource: "generators" },
  { keys: ["nurse", "नर्स", "నర్స్"], resource: "nurses" },
  { keys: ["doctor", "चिकित्सक", "వైద్యుడు", "medical staff", "medical"], resource: "medical staff" },
  { keys: ["blanket", "कंबल", "బ్లాంకెట్"], resource: "blankets" },
  { keys: ["food", "ration", "kit", "खाना", "ఆహారం"], resource: "food kits" },
  { keys: ["rescue", "ndrf", "personnel", "gear"], resource: "flood-rescue team" },
];

const WORD_QTY: [RegExp, number][] = [
  [/\btwenty\b/i, 20],
  [/\btwelve\b/i, 12],
  [/\beleven\b/i, 11],
  [/\bten\b/i, 10],
  [/\bnine\b/i, 9],
  [/\beight\b/i, 8],
  [/\bseven\b/i, 7],
  [/\bsix\b/i, 6],
  [/\bfive\b/i, 5],
  [/\bfour\b/i, 4],
  [/\bthree\b/i, 3],
  [/\btwo\b/i, 2],
  [/\b(one|an|एक|ఒక)\b/i, 1],
];

function knownPlacesText(): string {
  return WARDS.map((w) => `${w.id} = ${w.name}`).join("; ");
}

export function looksLikeOffer(text: string): boolean {
  return OFFER_HINT.test(text);
}

function locationFromOffer(text: string): { id: string; label: string } {
  const ward = text.match(/ward\s*(\d+)/i);
  if (ward) {
    const hit = WARDS.find((w) => w.id === `W${ward[1]}` || w.name.toLowerCase().includes(`ward ${ward[1]}`));
    if (hit) return { id: hit.id, label: hit.name };
    return { id: `W${ward[1]}`, label: `Ward ${ward[1]}` };
  }
  const named = WARDS.find((w) => {
    const tail = w.name.split(" ").slice(-1)[0]!.toLowerCase();
    return tail.length > 3 && text.toLowerCase().includes(tail);
  });
  if (named) return { id: named.id, label: named.name };
  if (/autonagar/i.test(text)) return { id: "W19", label: "Ward 19 Autonagar" };
  if (/gunadala/i.test(text)) return { id: "W14", label: "Ward 14 Gunadala" };
  if (/governorpet/i.test(text)) return { id: "W7", label: "Ward 7 Governorpet" };
  if (/hospital|ggh/i.test(text)) return { id: "HOSP", label: "GGH Hospital Vijayawada" };
  if (/shelter b/i.test(text)) return { id: "SH-B", label: "Shelter B Kanaka" };
  return { id: "W7", label: "Ward 7 Governorpet" };
}

function resourceFromOffer(text: string): string {
  const t = text.toLowerCase();
  for (const row of OFFER_RESOURCES) {
    if (row.keys.some((k) => t.includes(k.toLowerCase()))) return row.resource;
  }
  return "unspecified aid";
}

function quantityFromOffer(text: string): number {
  const digit = text.match(/(\d+)\s*(trucks?|lorries|boats?|kits?|nurses?|staff|blankets?|tankers?|generators?|ambulances?|personnel|people)?/i);
  if (digit) return Math.max(1, Number(digit[1]));
  for (const [re, n] of WORD_QTY) {
    if (re.test(text)) return n;
  }
  return 1;
}

export function parseOfferHeuristic(text: string): OfferFields {
  const loc = locationFromOffer(text);
  return {
    type: "offer",
    resource: resourceFromOffer(text),
    quantity: quantityFromOffer(text),
    locationId: loc.id,
    locationLabel: loc.label,
  };
}

export function offerSubjectKey(locationId: string, resource: string): string {
  return `offer:${locationId}:${resource}`;
}

function coerceOffer(json: Record<string, unknown> | null, fallback: OfferFields): OfferFields {
  if (!json) return fallback;
  const resource = String(json.resource ?? fallback.resource).trim() || fallback.resource;
  const qtyRaw = json.quantity;
  const quantity =
    typeof qtyRaw === "number" && Number.isFinite(qtyRaw)
      ? Math.max(1, Math.round(qtyRaw))
      : typeof qtyRaw === "string" && /^\d+$/.test(qtyRaw.trim())
        ? Math.max(1, Number(qtyRaw.trim()))
        : fallback.quantity;
  let locationId = String(json.locationId ?? fallback.locationId).trim() || fallback.locationId;
  let locationLabel = String(json.locationLabel ?? json.location ?? fallback.locationLabel).trim() || fallback.locationLabel;
  const known = WARDS.find(
    (w) => w.id === locationId || w.name.toLowerCase() === locationLabel.toLowerCase() || w.name.toLowerCase().includes(locationLabel.toLowerCase()),
  );
  if (known) {
    locationId = known.id;
    locationLabel = known.name;
  } else if (!/^W\d+|HOSP|SH-|SUB|LOC-/.test(locationId)) {
    locationId = fallback.locationId;
    locationLabel = fallback.locationLabel;
  }
  return { type: "offer", resource, quantity, locationId, locationLabel };
}

export function offerPrompt(text: string, fallback: OfferFields): string {
  return `Parse this as a resource OFFER (someone providing aid), not a need and not a hazard.
Return JSON only:
{"type":"offer","resource":"short plural noun (trucks, boats, food kits, medical staff)","quantity":number,"locationId":"W7","locationLabel":"Ward 7 Governorpet"}

Rules: type must be offer. quantity is how many units they can give (one/a = 1). Use a known place id when the text names one. If no place is named, keep locationId ${fallback.locationId}. Do not treat blocked roads or people who need help as offers.

Known places: ${knownPlacesText()}

Heuristic guess: ${JSON.stringify(fallback)}
Message: ${text}`;
}

export async function structureOffer(text: string, fallback: OfferFields): Promise<OfferFields & { model?: string }> {
  const { brainRaw } = await import("@/lib/featherless");
  const hit = await brainRaw(offerPrompt(text, fallback), 14000, 600);
  const offer = coerceOffer(hit?.json ?? null, fallback);
  return hit ? { ...offer, model: hit.model } : offer;
}

export async function refineOffer(text: string, fallback: OfferFields): Promise<OfferFields> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fallback }),
      });
      const data = (await res.json()) as { ok?: boolean; offer?: OfferFields };
      if (res.ok && data.ok && data.offer) {
        return coerceOffer(data.offer as unknown as Record<string, unknown>, fallback);
      }
    } catch {
      /* heuristic stands */
    }
    return fallback;
  }
  const structured = await structureOffer(text, fallback);
  const { model: _model, ...offer } = structured;
  return offer;
}
