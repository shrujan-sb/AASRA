"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useOps } from "@/lib/useOps";
import { useOperatorGeo } from "@/lib/operatorGeo";

const GeoRiskMap = dynamic(() => import("@/components/GeoRiskMap").then((m) => m.GeoRiskMap), { ssr: false });

type LiveRisk = {
  ok?: boolean;
  label?: string;
  level?: "high" | "elevated" | "watch";
  headline?: string;
  rainMm?: number;
  rainChance?: number;
  boundaryKm?: number;
  problems?: { title: string; source: string; url?: string }[];
};

export function RiskBoard() {
  const { incidents } = useOps();
  const geo = useOperatorGeo();
  const [live, setLive] = useState<LiveRisk | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!geo) return;
    const ac = new AbortController();
    void fetch(`/api/live-risk?lat=${geo.lat}&lng=${geo.lng}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data: LiveRisk) => {
        if (data.ok) setLive(data);
        else setErr("Could not read live weather for this pin.");
      })
      .catch(() => setErr("Live risk request failed."));
    return () => ac.abort();
  }, [geo?.lat, geo?.lng]);

  const level = live?.level ?? "watch";
  const km = live?.boundaryKm ?? 8;

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Your location · 24–48h</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-none">Risk</h1>
        <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
          Uses this device’s GPS. Map and forecast follow that pin — no area picker.
        </p>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      {!geo ? (
        <p className="px-5 py-8 text-[16px] text-[var(--mute)]">Allow location to lock this desk to your ground.</p>
      ) : (
        <div className="px-5 py-4 space-y-4">
          <section className="border border-[var(--ink)] bg-[var(--paper-2)] px-4 py-4">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
              {live?.label || `${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`} · {level}
              {typeof live?.rainMm === "number" ? ` · ${live.rainMm} mm` : ""}
            </p>
            <p className="mt-2 text-[20px] font-semibold leading-snug">
              {live?.headline || "Reading rain and nearby alerts for your pin…"}
            </p>
          </section>
          <div className="border border-[var(--ink)] overflow-hidden">
            <GeoRiskMap lat={geo.lat} lng={geo.lng} level={level} boundaryKm={km} incidents={incidents} />
          </div>
          {live?.problems && live.problems.length > 0 ? (
            <section>
              <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Live web</p>
              <ul className="mt-2 border border-[var(--ink)] bg-white">
                {live.problems.map((p, i) => (
                  <li key={`${p.title}-${i}`} className="border-b border-[var(--rule)] last:border-0 px-4 py-3">
                    <p className="font-medium leading-snug">{p.title}</p>
                    <p className="mt-1 text-[12px] text-[var(--mute)]">{p.source}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
