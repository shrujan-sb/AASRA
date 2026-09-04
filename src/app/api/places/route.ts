import { NextResponse } from "next/server";
import { reversePlace, suggestPlaces } from "@/lib/places";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") ?? "").trim();
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (Number.isFinite(lat) && Number.isFinite(lng) && searchParams.has("lat")) {
    const hit = await reversePlace(lat, lng);
    return NextResponse.json({ hits: hit ? [hit] : [] });
  }
  if (q.length < 1) return NextResponse.json({ hits: [] });
  const hits = await suggestPlaces(q);
  return NextResponse.json({ hits });
}
