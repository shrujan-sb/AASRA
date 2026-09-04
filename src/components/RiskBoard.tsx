"use client";

import { useState } from "react";
import type { PrepRisk } from "@/lib/types";
import { useOps } from "@/lib/useOps";

type PredictRiskResponse = {
  ok?: boolean;
  studied?: boolean;
  model?: string;
  windowHours?: number;
  headline?: string;
  wards?: PrepRisk[];
  error?: string;
};

export function RiskBoard() {
  const { incidents, hazards } = useOps();
  const [wards, setWards] = useState<PrepRisk[]>([]);
  const [headline, setHeadline] = useState("");
  const [windowHours, setWindowHours] = useState(48);
  const [model, setModel] = useState("");
  const [studied, setStudied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/predict-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidents, hazards }),
      });
      const data = (await res.json()) as PredictRiskResponse;
      if (!res.ok || !data.ok || !data.wards?.length) {
        setErr(data.error || "Risk desk failed.");
        return;
      }
      setWards(data.wards);
      setHeadline(data.headline || data.wards[0].blurb);
      setWindowHours(data.windowHours ?? 48);
      setModel(data.model || "");
      setStudied(Boolean(data.studied));
    } catch {
      setErr("Risk desk failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">24–48 hours</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-none">Risk</h1>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className="h-10 px-4 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50"
          >
            {busy ? "Clerk thinking…" : wards.length ? "Run again" : "Ask the clerk"}
          </button>
        </div>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      {!wards.length ? (
        <div className="px-5 py-8 max-w-[62ch]">
          <p className="text-[16px] leading-relaxed text-[var(--mute)]">
            Krishna-delta wards — Vijayawada, Guntur, Tenali. The clerk reads rainfall, terrain, flood history, and
            population, then writes a 24–48 hour flood-risk sentence for each ward.
          </p>
        </div>
      ) : (
        <div className="px-5 py-5 space-y-6">
          <section className="border border-[var(--ink)] bg-[var(--paper-2)] px-4 py-4">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
              {windowHours}h window
              {studied ? (model ? ` · ${model}` : "") : " · desk heuristic"}
            </p>
            <p className="mt-2 text-[20px] font-semibold leading-snug">{headline}</p>
          </section>

          <section>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Krishna delta</p>
            <h2 className="mt-1 text-[20px] font-semibold">Wards</h2>
            <ul className="mt-3 border border-[var(--ink)] bg-white">
              {wards.map((r) => (
                <li key={r.wardId} className="border-b border-[var(--rule)] last:border-0 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      {r.wardName}{" "}
                      <span className="font-normal text-[var(--mute)]">· {r.horizonHours}h</span>
                    </span>
                    <span className={r.level === "high" ? "text-[var(--crit)] font-semibold" : "text-[var(--mute)]"}>
                      {r.level}
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] leading-snug">{r.blurb}</p>
                  {r.drivers.length ? (
                    <p className="mt-1 text-[12px] text-[var(--mute)]">{r.drivers.join(" · ")}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
