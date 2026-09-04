"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { incidentLatLng } from "@/lib/geo";
import { tileUrl } from "@/lib/places";
import type { Incident } from "@/lib/types";

type Props = {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function pinClass(s: Incident["severity"]) {
  if (s === "critical") return "aasra-pin aasra-pin-crit";
  if (s === "high") return "aasra-pin aasra-pin-high";
  return "aasra-pin aasra-pin-ok";
}

export function OpsEmergenciesMap({ incidents, selectedId, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const pins = useMemo(
    () =>
      incidents
        .filter((i) => i.status !== "resolved")
        .map((i) => {
          const p = incidentLatLng(i);
          return { id: i.id, lat: p.lat, lng: p.lng, title: i.title, severity: i.severity, place: i.locationLabel };
        }),
    [incidents],
  );
  const stamp = pins.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.severity}`).join("|") + `|${selectedId ?? ""}`;

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    const map = L.map(host.current, { scrollWheelZoom: true }).setView([16.48, 80.62], 11);
    L.tileLayer(tileUrl(), { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const latlngs: L.LatLngExpression[] = [];
    for (const pin of pins) {
      const on = selectedId === pin.id;
      const icon = L.divIcon({
        className: `${pinClass(pin.severity)}${on ? " aasra-pin-on" : ""}`,
        iconSize: on ? [18, 18] : [14, 14],
        iconAnchor: on ? [9, 9] : [7, 7],
      });
      const m = L.marker([pin.lat, pin.lng], { icon }).addTo(layer);
      m.bindTooltip(`${pin.title} — ${pin.place}`, { direction: "top" });
      m.on("click", () => selectRef.current(pin.id));
      latlngs.push([pin.lat, pin.lng]);
    }
    if (latlngs.length === 1) map.setView(latlngs[0]!, 14);
    else if (latlngs.length > 1) map.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28], maxZoom: 14 });
    requestAnimationFrame(() => map.invalidateSize());
  }, [stamp, pins, selectedId]);

  return <div ref={host} className="h-full min-h-[360px] w-full bg-[var(--paper-2)]" />;
}
