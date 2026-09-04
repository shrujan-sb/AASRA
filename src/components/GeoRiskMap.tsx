"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { incidentLatLng } from "@/lib/geo";
import { tileUrl } from "@/lib/places";
import type { Incident } from "@/lib/types";

type Props = {
  lat: number;
  lng: number;
  level: "high" | "elevated" | "watch";
  boundaryKm: number;
  incidents: Incident[];
};

function color(level: Props["level"]) {
  if (level === "high") return "#c42718";
  if (level === "elevated") return "#b45309";
  return "#1f6b4a";
}

export function GeoRiskMap({ lat, lng, level, boundaryKm, incidents }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlay = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    const map = L.map(host.current, { scrollWheelZoom: true }).setView([lat, lng], 12);
    L.tileLayer(tileUrl(), { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
    overlay.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      overlay.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = overlay.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const c = color(level);
    L.circle([lat, lng], {
      radius: boundaryKm * 1000,
      color: c,
      fillColor: c,
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(layer);
    L.circleMarker([lat, lng], { radius: 7, color: "#1c1612", fillColor: c, fillOpacity: 1, weight: 2 }).addTo(layer);
    for (const i of incidents.filter((x) => x.status !== "resolved")) {
      const p = incidentLatLng(i);
      L.circleMarker([p.lat, p.lng], {
        radius: 5,
        color: i.severity === "critical" ? "#c42718" : i.severity === "high" ? "#b45309" : "#1f6b4a",
        fillOpacity: 1,
        weight: 1,
      })
        .bindTooltip(i.title)
        .addTo(layer);
    }
    map.setView([lat, lng], 12);
  }, [lat, lng, level, boundaryKm, incidents]);

  return <div ref={host} className="h-[min(52vh,420px)] w-full bg-[var(--paper-2)]" />;
}
