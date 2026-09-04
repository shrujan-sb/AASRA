"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { tileUrl } from "@/lib/places";
import { readCachedGeo } from "@/lib/operatorGeo";

const FALLBACK = { lat: 20.5937, lng: 78.9629 };

type Props = {
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
};

export function ReportMap({ lat, lng, onPick }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    const here = readCachedGeo();
    const start = here ?? FALLBACK;
    const map = L.map(host.current, { scrollWheelZoom: true }).setView([start.lat, start.lng], here ? 13 : 5);
    L.tileLayer(tileUrl(), {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 20,
    }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => pickRef.current(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 13);
      });
    }
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return;
    const icon = L.divIcon({ className: "aasra-pin", iconSize: [14, 14], iconAnchor: [7, 7] });
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLatLng();
        pickRef.current(p.lat, p.lng);
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.4 });
  }, [lat, lng]);

  return <div ref={host} className="h-full min-h-[280px] w-full bg-[var(--paper-2)]" />;
}
