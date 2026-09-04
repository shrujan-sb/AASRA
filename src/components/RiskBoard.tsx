"use client";

import { useEffect, useState } from "react";
import { useOperatorGeo } from "@/lib/operatorGeo";

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

export function RiskBoard({ embedded = false }: { embedded?: boolean }) {
  const geo = useOperatorGeo();
  const [live, setLive] = useState<LiveRisk | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!geo) return;
    const ac = new AbortController();
    void fetch(`/api/live-risk?lat=${geo.lat}&lng=${geo.lng}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data: LiveRisk) => {
        if (data.ok) {
          setLive(data);
          setErr("");
        }
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setErr("Live weather is delayed. Preplan still uses the citizen queue.");
      });
    return () => ac.abort();
  }, [geo?.lat, geo?.lng]);

  const level = live?.level ?? "watch";

  return (
    <div className={embedded ? "space-y-4" : "h-full overflow-auto bg-[var(--paper)]"}>
      {embedded ? (
        <header>
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Predict · Risk Assessment</p>
          <h2 className="mt-1 text-[22px] font-semibold leading-none">Risk Assessment</h2>
          <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
            Uses this device’s GPS. Map and forecast follow that pin — no area picker.
          </p>
          {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
        </header>
      ) : (
        <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Your location · 24–48h</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-none">Risk</h1>
          <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
            Uses this device’s GPS. Map and forecast follow that pin — no area picker.
          </p>
          {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
        </header>
      )}

      {!geo ? (
        <p className={embedded ? "text-[16px] text-[var(--mute)]" : "px-5 py-8 text-[16px] text-[var(--mute)]"}>
          Allow location to lock this desk to your ground.
        </p>
      ) : (
        <div className={embedded ? "space-y-4" : "px-5 py-4 space-y-4"}>
          <section className="border border-[var(--ink)] bg-[var(--paper-2)] px-4 py-4">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
              {live?.label || `${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`} · {level}
              {typeof live?.rainMm === "number" ? ` · ${live.rainMm} mm` : ""}
            </p>
            <p className="mt-2 text-[20px] font-semibold leading-snug">
              {live?.headline || "Reading rain and nearby alerts for your pin…"}
            </p>
          </section>
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
