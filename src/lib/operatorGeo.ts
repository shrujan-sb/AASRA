"use client";

import { useEffect, useState } from "react";

export type OperatorGeo = {
  lat: number;
  lng: number;
  accuracyM?: number;
};

const KEY = "aasra-geo";

export const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 } as const;

export function readCachedGeo(): OperatorGeo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as OperatorGeo;
    if (typeof p.lat === "number" && typeof p.lng === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function useOperatorGeo(fallback = true) {
  const [geo, setGeo] = useState<OperatorGeo | null>(readCachedGeo);

  useEffect(() => {
    if (!navigator.geolocation) {
      if (fallback) setGeo(INDIA_CENTER);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next: OperatorGeo = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        };
        setGeo(next);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      },
      () => {
        const cached = readCachedGeo();
        setGeo(cached ?? (fallback ? INDIA_CENTER : null));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [fallback]);

  return geo ?? (fallback ? INDIA_CENTER : null);
}
