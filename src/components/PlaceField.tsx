"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import { fetchPlaceHits, fetchReversePlace, geocodePlace } from "@/lib/placesClient";
import { localSuggest, type PlaceHit } from "@/lib/places";

const ReportMap = dynamic(() => import("@/components/ReportMap").then((m) => m.ReportMap), { ssr: false });

type SuggestProps = {
  value: string;
  onChange: (label: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  required?: boolean;
};

export function PlaceSuggest({ value, onChange, placeholder, required = true }: SuggestProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setHits([]);
      setOpen(false);
      return;
    }
    setHits(localSuggest(q));
    setOpen(true);
    const t = window.setTimeout(() => {
      void fetchPlaceHits(q).then((rows) => {
        const next = rows.slice(0, 5);
        setHits(next.length ? next : localSuggest(q));
        setActive(0);
        setOpen(true);
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [value]);

  useEffect(() => {
    function hide(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", hide);
    return () => document.removeEventListener("mousedown", hide);
  }, []);

  function pick(hit: PlaceHit) {
    onChange(hit.label, hit.lat, hit.lng);
    setOpen(false);
  }

  return (
    <div ref={box} className="relative z-[4000]">
      <input
        required={required}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder ?? "Start typing a place — street, mandal, landmark…"}
        className="site-input"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          const rows = hits.length ? hits : localSuggest(value);
          if (rows.length) {
            setHits(rows);
            setOpen(true);
          }
        }}
        onKeyDown={(e) => {
          if (!open || !hits.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % hits.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + hits.length) % hits.length);
          } else if (e.key === "Enter" && hits[active]) {
            e.preventDefault();
            pick(hits[active]!);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && hits.length > 0 && (
        <ul id={listId} role="listbox" className="place-suggest">
          {hits.slice(0, 5).map((h, i) => (
            <li key={h.id} className="border-t border-[var(--rule)] first:border-t-0">
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`block w-full px-3 py-2.5 text-left ${i === active ? "bg-[var(--paper)]" : "bg-white"}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(h)}
              >
                <span className="block font-medium">{h.name}</span>
                <span className="block text-[13px] text-[var(--mute)]">{h.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Props = {
  value: string;
  onChange: (label: string, lat?: number, lng?: number) => void;
  lat?: number;
  lng?: number;
};

export function PlaceField({ value, onChange, lat, lng }: Props) {
  async function pickMap(nextLat: number, nextLng: number) {
    const hit = await fetchReversePlace(nextLat, nextLng);
    onChange(hit?.label || `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`, nextLat, nextLng);
  }

  return (
    <div>
      <PlaceSuggest value={value} onChange={onChange} />
      <p className="mt-2 text-[13px] text-[var(--mute)]">Pick one of the five names, or click the map.</p>
      <div className="relative z-0 mt-3 h-[min(52vh,440px)] isolate overflow-hidden border border-[var(--ink)]">
        <ReportMap lat={lat} lng={lng} onPick={(a, b) => void pickMap(a, b)} />
      </div>
    </div>
  );
}

export { geocodePlace };
