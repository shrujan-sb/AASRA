export type PlaceHit = {
  id: string;
  name: string;
  detail: string;
  label: string;
  lat: number;
  lng: number;
};

const KEY = process.env.GEOAPIFY_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_KEY || "";
const BIAS = "proximity:80.648,16.5062";

export const LOCAL_PLACES: PlaceHit[] = [
  { id: "tenali-market", name: "Tenali vegetable market", detail: "Tenali, Guntur district", label: "Tenali vegetable market, Tenali, Andhra Pradesh", lat: 16.2428, lng: 80.6405 },
  { id: "autonagar", name: "Autonagar flyover", detail: "Vijayawada", label: "Autonagar flyover, Vijayawada, Andhra Pradesh", lat: 16.487, lng: 80.666 },
  { id: "pedakakani", name: "Pedakakani junction", detail: "Guntur district", label: "Pedakakani junction, Guntur district, Andhra Pradesh", lat: 16.34, lng: 80.49 },
  { id: "guntur-collector", name: "Guntur Collectorate", detail: "Guntur", label: "Guntur Collectorate, Guntur, Andhra Pradesh", lat: 16.3067, lng: 80.4365 },
  { id: "krishna-barrage", name: "Prakasam barrage", detail: "Vijayawada", label: "Prakasam barrage, Vijayawada, Andhra Pradesh", lat: 16.5062, lng: 80.608 },
  { id: "mangalagiri", name: "Mangalagiri", detail: "Guntur district", label: "Mangalagiri, Andhra Pradesh", lat: 16.4308, lng: 80.5681 },
  { id: "benz-circle", name: "Benz Circle", detail: "Vijayawada", label: "Benz Circle, Vijayawada, Andhra Pradesh", lat: 16.5033, lng: 80.646 },
  { id: "vijayawada-railway", name: "Vijayawada Junction", detail: "Railway station", label: "Vijayawada Junction railway station, Andhra Pradesh", lat: 16.518, lng: 80.62 },
  { id: "narakasaraopet", name: "Narasaraopet", detail: "Palnadu district", label: "Narasaraopet, Andhra Pradesh", lat: 16.251, lng: 80.048 },
  { id: "machilipatnam", name: "Machilipatnam", detail: "Krishna district", label: "Machilipatnam, Andhra Pradesh", lat: 16.1875, lng: 81.1389 },
  { id: "repalle", name: "Repalle", detail: "Bapatla district", label: "Repalle, Andhra Pradesh", lat: 16.018, lng: 80.829 },
  { id: "bapatla", name: "Bapatla", detail: "Bapatla district", label: "Bapatla, Andhra Pradesh", lat: 15.904, lng: 80.467 },
];

export function localSuggest(query: string): PlaceHit[] {
  const q = query.trim().toLowerCase();
  const scored = LOCAL_PLACES.map((p) => {
    const hay = `${p.name} ${p.detail} ${p.label}`.toLowerCase();
    const score = !q ? 1 : hay.includes(q) ? 3 : q.split(/\s+/).every((w) => hay.includes(w)) ? 2 : 0;
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
  const out = [...scored];
  for (const p of LOCAL_PLACES) {
    if (out.length >= 5) break;
    if (!out.some((x) => x.id === p.id)) out.push(p);
  }
  return out.slice(0, 5);
}

function fromFeature(f: {
  properties?: Record<string, unknown>;
  geometry?: { coordinates?: number[] };
}): PlaceHit | null {
  const p = f.properties ?? {};
  const coords = f.geometry?.coordinates;
  const lng = Number(coords?.[0]);
  const lat = Number(coords?.[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const name = String(p.name || p.address_line1 || p.formatted || "Place");
  const formatted = String(p.formatted || name);
  const detail = formatted === name ? String(p.city || p.state || p.country || "") : formatted;
  return {
    id: String(p.place_id || `${lat},${lng}`),
    name,
    detail,
    label: formatted,
    lat,
    lng,
  };
}

function mergeHits(...groups: PlaceHit[][]): PlaceHit[] {
  const seen = new Set<string>();
  const out: PlaceHit[] = [];
  for (const group of groups) {
    for (const row of group) {
      const key = `${row.label.toLowerCase()}|${row.lat.toFixed(3)}|${row.lng.toFixed(3)}`;
      if (seen.has(key) || seen.has(row.id)) continue;
      seen.add(key);
      seen.add(row.id);
      out.push(row);
      if (out.length >= 5) return out;
    }
  }
  return out;
}

async function geoapifyAutocomplete(text: string): Promise<PlaceHit[]> {
  if (!KEY) return [];
  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.searchParams.set("text", text);
  url.searchParams.set("limit", "5");
  url.searchParams.set("filter", "countrycode:in");
  url.searchParams.set("bias", BIAS);
  url.searchParams.set("lang", "en");
  url.searchParams.set("apiKey", KEY);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: unknown[] };
  return (data.features ?? []).map((f) => fromFeature(f as never)).filter((x): x is PlaceHit => Boolean(x));
}

async function nominatimSearch(text: string): Promise<PlaceHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", text);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("viewbox", "79.6,17.3,81.4,15.6");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "Aasra-ReliefMesh/1.0 (https://aasra.vercel.app)" },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{
    place_id?: number;
    display_name?: string;
    name?: string;
    lat?: string;
    lon?: string;
  }>;
  return rows
    .map((r) => {
      const lat = Number(r.lat);
      const lng = Number(r.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const label = String(r.display_name || r.name || "Place");
      const name = String(r.name || label.split(",")[0]);
      return {
        id: `osm-${r.place_id ?? `${lat},${lng}`}`,
        name,
        detail: label,
        label,
        lat,
        lng,
      } satisfies PlaceHit;
    })
    .filter((x): x is PlaceHit => Boolean(x));
}

export async function suggestPlaces(query: string): Promise<PlaceHit[]> {
  const text = query.trim();
  if (text.length < 1) return [];
  const local = localSuggest(text);
  try {
    const [geo, osm] = await Promise.all([geoapifyAutocomplete(text), nominatimSearch(text)]);
    const merged = mergeHits(geo, osm, local);
    return merged.length ? merged : local;
  } catch {
    return local;
  }
}

export async function reversePlace(lat: number, lng: number): Promise<PlaceHit | null> {
  if (KEY) {
    const url = new URL("https://api.geoapify.com/v1/geocode/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("apiKey", KEY);
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = (await res.json()) as { features?: unknown[] };
      const hit = data.features?.[0] ? fromFeature(data.features[0] as never) : null;
      if (hit) return hit;
    }
  }
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "Aasra-ReliefMesh/1.0 (https://aasra.vercel.app)" },
  });
  if (!res.ok) return { id: `pin-${lat},${lng}`, name: "Dropped pin", detail: "", label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  const r = (await res.json()) as { display_name?: string; name?: string };
  const label = String(r.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  return {
    id: `rev-${lat},${lng}`,
    name: String(r.name || label.split(",")[0]),
    detail: label,
    label,
    lat,
    lng,
  };
}

export async function geocodePlace(query: string): Promise<PlaceHit | null> {
  const hits = await suggestPlaces(query);
  return hits[0] ?? null;
}

export function geoapifyReady(): boolean {
  return Boolean(KEY);
}

export function tileUrl(): string {
  if (KEY) return `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${KEY}`;
  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
}
