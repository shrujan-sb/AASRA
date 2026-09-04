"use client";

import { useState } from "react";
import { nid, upsert } from "@/lib/db";
import { wardById } from "@/lib/geo";
import type { Assignment, BeforeBrief, ResourceAsset } from "@/lib/types";
import { useOps } from "@/lib/useOps";

const KINDS = ["school", "hospital", "elderly", "road", "substation", "shelter"] as const;

export function PredictBoard() {
  const { resources, incidents, hazards, assignments } = useOps();
  const [brief, setBrief] = useState<BeforeBrief | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [applied, setApplied] = useState(false);

  async function run() {
    setBusy(true);
    setErr("");
    setApplied(false);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resources, incidents, hazards }),
      });
      const data = (await res.json()) as { ok?: boolean; brief?: BeforeBrief; error?: string };
      if (!res.ok || !data.brief) {
        setErr(data.error || "Predict desk failed.");
        return;
      }
      setBrief(data.brief);
    } catch {
      setErr("Predict desk failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyMoves() {
    if (!brief?.moves.length) return;
    setBusy(true);
    try {
      for (const m of brief.moves) {
        const unit = resources.find((r) => r.id === m.resourceId);
        if (!unit || unit.status !== "free") continue;
        const next: ResourceAsset = {
          ...unit,
          locationId: m.toId,
          status: "en_route",
          notes: `Pre-position to ${m.toLabel}`,
        };
        await upsert("resources", unit.id, next);
        const row: Assignment = {
          id: nid("PREP"),
          incidentId: `PREP-${m.toId}`,
          resourceId: unit.id,
          reason: `Before cyclone: ${m.callsign} ${wardById(m.fromId).name} → ${m.toLabel}. ${m.why}`,
          etaMin: 18,
          viaRoadIds: [],
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await upsert("assignments", row.id, row);
      }
      setApplied(true);
    } finally {
      setBusy(false);
    }
  }

  const staged = assignments.filter((a) => a.incidentId.startsWith("PREP-") && a.status === "active");

  return (
    <div className="h-full overflow-auto">
      <header className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-[var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Before landfall</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-none">Predict</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run()}
              className="h-10 px-4 bg-[var(--ink)] text-white disabled:opacity-50"
            >
              {busy ? "Clerk thinking…" : brief ? "Run again" : "Ask the clerk"}
            </button>
            {brief?.moves.length ? (
              <button
                type="button"
                disabled={busy || applied}
                onClick={() => void applyMoves()}
                className="h-10 px-4 border border-[var(--ink)] bg-white disabled:opacity-50"
              >
                {applied ? "Moves written" : "Apply staging"}
              </button>
            ) : null}
          </div>
        </div>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      {!brief ? (
        <div className="px-5 py-8 max-w-[62ch]">
          <p className="text-[16px] leading-relaxed text-[var(--mute)]">
            Rainfall, terrain, flood history, and population for Vijayawada, Guntur, and Tenali. The clerk writes ward
            risk for the next 24–48 hours, lists what gets hit, and stages boats, medical cells, and tankers before the
            cyclone arrives.
          </p>
          {staged.length > 0 ? (
            <p className="mt-4 text-[14px]">
              {staged.length} pre-position assignment{staged.length === 1 ? "" : "s"} already on the desk.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="px-5 py-5 space-y-8">
          <section className="ops-dossier">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
              {brief.windowHours}h window{brief.fallback ? " · desk heuristic" : brief.model ? ` · ${brief.model}` : ""}
            </p>
            <p className="mt-2 text-[20px] font-semibold leading-snug">{brief.headline}</p>
            <p className="mt-3 text-[15px] leading-relaxed">{brief.orders}</p>
          </section>

          <section>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Risk</p>
            <h2 className="mt-1 text-[20px] font-semibold">Wards</h2>
            <ul className="mt-3 border border-[var(--ink)]">
              {brief.risks.map((r) => (
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
                  <p className="mt-1 text-[14px] leading-snug">{r.blurb}</p>
                  <p className="mt-1 text-[12px] text-[var(--mute)]">{r.drivers.join(" · ")}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">If the flood comes</p>
            <h2 className="mt-1 text-[20px] font-semibold">What is hit</h2>
            <div className="mt-3 overflow-x-auto border border-[var(--ink)]">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-[var(--ink)] text-[11px] uppercase tracking-[0.12em] text-[var(--mute)]">
                    <th className="px-3 py-2 font-medium">Kind</th>
                    <th className="px-3 py-2 font-medium">Site</th>
                    <th className="px-3 py-2 font-medium">Ward</th>
                    <th className="px-3 py-2 font-medium">Hit</th>
                    <th className="px-3 py-2 font-medium">Move</th>
                  </tr>
                </thead>
                <tbody>
                  {brief.vulnerable.map((v, i) => (
                    <tr key={`${v.kind}-${v.name}-${i}`} className="border-b border-[var(--rule)] last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">{KINDS.includes(v.kind) ? v.kind : v.kind}</td>
                      <td className="px-3 py-2 font-medium">{v.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{v.wardId}</td>
                      <td className="px-3 py-2 text-[var(--mute)]">{v.why}</td>
                      <td className="px-3 py-2">{v.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Pre-position</p>
            <h2 className="mt-1 text-[20px] font-semibold">Recommended moves</h2>
            <ul className="mt-3 border border-[var(--ink)]">
              {brief.moves.map((m) => (
                <li key={`${m.resourceId}-${m.toId}`} className="flex flex-wrap gap-3 border-b border-[var(--rule)] last:border-0 px-4 py-3">
                  <span className="w-36 font-medium">{m.callsign}</span>
                  <span className="text-[var(--mute)]">
                    {wardById(m.fromId).name} → {m.toLabel}
                  </span>
                  <span className="flex-1 min-w-[16ch]">{m.why}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
