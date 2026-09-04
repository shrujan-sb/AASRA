"use client";

import { localSuggest, type PlaceHit } from "@/lib/places";

export async function fetchPlaceHits(query: string): Promise<PlaceHit[]> {
  const q = query.trim();
  const fallback = localSuggest(q);
  if (q.length < 1) return [];
  try {
    const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
    const data = (await res.json()) as { hits?: PlaceHit[] };
    const hits = (data.hits ?? []).slice(0, 5);
    return hits.length ? hits : fallback;
  } catch {
    return fallback;
  }
}

export async function fetchReversePlace(lat: number, lng: number): Promise<PlaceHit | null> {
  try {
    const res = await fetch(`/api/places?lat=${lat}&lng=${lng}`);
    const data = (await res.json()) as { hits?: PlaceHit[] };
    return data.hits?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function geocodePlace(query: string): Promise<PlaceHit | null> {
  const hits = await fetchPlaceHits(query);
  return hits[0] ?? null;
}
