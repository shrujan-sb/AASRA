import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

type Problem = { title: string; source: string; url?: string };

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function timed<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

async function reverseLabel(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Aasra-ReliefMesh/1.0 (https://aasra.vercel.app)" },
    cache: "no-store",
  });
  if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const j = (await res.json()) as { display_name?: string; name?: string; address?: Record<string, string> };
  const a = j.address ?? {};
  return a.suburb || a.neighbourhood || a.city || a.town || a.village || a.state || j.name || j.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

async function weather(lat: number, lng: number): Promise<{ rainMm: number; rainChance: number }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,precipitation_probability_max&forecast_days=2&timezone=auto`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { rainMm: 0, rainChance: 0 };
  const j = (await res.json()) as { daily?: { precipitation_sum?: number[]; precipitation_probability_max?: number[] } };
  const mm = (j.daily?.precipitation_sum ?? []).reduce((a, b) => a + (Number(b) || 0), 0);
  const chance = Math.max(0, ...(j.daily?.precipitation_probability_max ?? [0]).map((n) => Number(n) || 0));
  return { rainMm: Math.round(mm * 10) / 10, rainChance: chance };
}

async function wikiNear(lat: number, lng: number): Promise<Problem[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=15000&gslimit=8&format=json&origin=*`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const j = (await res.json()) as { query?: { geosearch?: { title: string; pageid: number }[] } };
  return (j.query?.geosearch ?? []).slice(0, 6).map((g) => ({
    title: g.title,
    source: "Wikipedia nearby",
    url: `https://en.wikipedia.org/?curid=${g.pageid}`,
  }));
}

async function searchProblems(place: string): Promise<Problem[]> {
  const q = encodeURIComponent(`${place} flood alert OR cyclone OR rain warning OR disaster`);
  const url = `https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Aasra-ReliefMesh/1.0 (https://aasra.vercel.app)" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const j = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: { Text?: string; FirstURL?: string }[];
  };
  const out: Problem[] = [];
  if (j.AbstractText) {
    out.push({ title: j.AbstractText.slice(0, 180), source: j.Heading || "Web", url: j.AbstractURL });
  }
  for (const t of j.RelatedTopics ?? []) {
    if (t.Text) out.push({ title: t.Text.slice(0, 160), source: "Web", url: t.FirstURL });
    if (out.length >= 6) break;
  }
  return out;
}

function levelOf(rainMm: number, rainChance: number): "high" | "elevated" | "watch" {
  if (rainMm >= 40 || rainChance >= 80) return "high";
  if (rainMm >= 12 || rainChance >= 55) return "elevated";
  return "watch";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = num(url.searchParams.get("lat"));
  const lng = num(url.searchParams.get("lng"));
  if (lat == null || lng == null) {
    return NextResponse.json({ ok: false, error: "lat and lng required" }, { status: 400 });
  }

  const wx = (await timed(weather(lat, lng), 2500)) ?? { rainMm: 0, rainChance: 0 };
  const label = (await timed(reverseLabel(lat, lng), 2500)) ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const [wiki, web] = await Promise.all([timed(wikiNear(lat, lng), 2500), timed(searchProblems(label), 2500)]);
  const problems = [...(web ?? []), ...(wiki ?? [])].slice(0, 8);
  const level = levelOf(wx.rainMm, wx.rainChance);
  const headline =
    level === "high"
      ? `${label}: high flood risk next 24–48h — ${wx.rainMm} mm rain, ${wx.rainChance}% chance.`
      : level === "elevated"
        ? `${label}: elevated flood risk next 24–48h — ${wx.rainMm} mm rain.`
        : `${label}: watch. ${wx.rainMm} mm rain in the 48h forecast.`;

  return NextResponse.json({
    ok: true,
    lat,
    lng,
    label,
    level,
    headline,
    rainMm: wx.rainMm,
    rainChance: wx.rainChance,
    boundaryKm: 8,
    problems,
    instant: true,
  });
}
