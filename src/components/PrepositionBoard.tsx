"use client";

import { useMemo, useState } from "react";
import { nid, upsert } from "@/lib/db";
import { isBoat, isMed, isTanker, unitRole } from "@/lib/delta";
import { travelMinutes, wardById } from "@/lib/geo";
import type { Assignment, PrepositionPlan, ResourceAsset } from "@/lib/types";
import { useOps } from "@/lib/useOps";

export function PrepositionBoard() {
  const { resources, incidents, hazards, assignments } = useOps();
  const [plan, setPlan] = useState<PrepositionPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [applied, setApplied] = useState(false);

  const boats = useMemo(() => resources.filter(isBoat), [resources]);
  const medical = useMemo(() => resources.filter(isMed), [resources]);
  const tankers = useMemo(() => resources.filter(isTanker), [resources]);
  const staged = assignments.filter((a) => a.incidentId.startsWith("PREP-") && a.status === "active");

  async function run() {
    setBusy(true);
    setErr("");
    setApplied(false);
    try {
      const res = await fetch("/api/preposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resources, incidents, hazards }),
      });
      const data = (await res.json()) as { ok?: boolean; plan?: PrepositionPlan; error?: string };
      if (!res.ok || !data.plan) {
        setErr(data.error || "Staging desk failed.");
        return;
      }
      setPlan(data.plan);
    } catch {
      setErr("Staging desk failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyMoves() {
    if (!plan?.moves.length) return;
    setBusy(true);
    try {
      const blocked = new Set(hazards.filter((h) => h.status === "blocked").map((h) => h.roadId));
      for (const m of plan.moves) {
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
          etaMin: travelMinutes(m.fromId || unit.locationId, m.toId, blocked),
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

  return (
    <div className="h-full overflow-auto">
      <header className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-[var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Before landfall</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-none">Pre-position</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run()}
              className="h-10 px-4 bg-[var(--ink)] text-white disabled:opacity-50"
            >
              {busy ? "Clerk optimizing…" : plan ? "Optimize again" : "Optimize staging"}
            </button>
            {plan?.moves.length ? (
              <button
                type="button"
                disabled={busy || applied}
                onClick={() => void applyMoves()}
                className="h-10 px-4 border border-[var(--ink)] bg-white disabled:opacity-50"
              >
                {applied ? "Moves written" : "Move units"}
              </button>
            ) : null}
          </div>
        </div>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      <div className="px-5 py-5 space-y-8">
        <p className="max-w-[62ch] text-[16px] leading-relaxed text-[var(--mute)]">
          Clerk stages free boats, medical teams, and water tankers to named Krishna-delta sites before the cyclone.
          Live units come from the duty board.
        </p>

        <section>
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">On the board</p>
          <h2 className="mt-1 text-[20px] font-semibold">Units that can stage</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <CountCard label="Boats" n={boats.filter((r) => r.status === "free").length} total={boats.length} />
            <CountCard label="Medical" n={medical.filter((r) => r.status === "free").length} total={medical.length} />
            <CountCard label="Tankers" n={tankers.filter((r) => r.status === "free").length} total={tankers.length} />
          </div>
          <ul className="mt-3 border border-[var(--ink)]">
            {[...boats, ...medical.filter((r) => !isBoat(r)), ...tankers.filter((r) => !isBoat(r) && !isMed(r))].map(
              (r) => (
                <li key={r.id} className="flex flex-wrap gap-3 border-b border-[var(--rule)] last:border-0 px-4 py-3">
                  <span className="w-36 font-medium">{r.callsign}</span>
                  <span className="w-20 text-[var(--mute)]">{unitRole(r)}</span>
                  <span className={r.status === "free" ? "text-[var(--ok)]" : "text-[var(--warn)]"}>{r.status}</span>
                  <span className="flex-1 min-w-[12ch] text-[var(--mute)]">{wardById(r.locationId).name}</span>
                </li>
              ),
            )}
          </ul>
        </section>

        {staged.length > 0 && !plan ? (
          <p className="text-[14px]">
            {staged.length} pre-position assignment{staged.length === 1 ? "" : "s"} already on the desk.
          </p>
        ) : null}

        {plan ? (
          <>
            <section className="ops-dossier">
              <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
                Staging order
                {plan.fallback ? " · desk heuristic" : plan.model ? ` · ${plan.model}` : ""}
              </p>
              <p className="mt-2 text-[20px] font-semibold leading-snug">{plan.headline}</p>
              <p className="mt-3 text-[15px] leading-relaxed">{plan.orders}</p>
              <p className="mt-3 text-[14px] tabular-nums">
                {plan.boats} boats · {plan.medical} medical · {plan.tankers} tankers
              </p>
            </section>

            <section>
              <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Named locations</p>
              <h2 className="mt-1 text-[20px] font-semibold">Where they go</h2>
              <ul className="mt-3 border border-[var(--ink)]">
                {plan.sites.map((s) => (
                  <li key={s.id} className="border-b border-[var(--rule)] last:border-0 px-4 py-3">
                    <div className="font-semibold">{s.label}</div>
                    <p className="mt-1 text-[14px] text-[var(--mute)]">{s.why}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Moves</p>
              <h2 className="mt-1 text-[20px] font-semibold">Recommended staging</h2>
              {plan.moves.length ? (
                <ul className="mt-3 border border-[var(--ink)]">
                  {plan.moves.map((m) => (
                    <li
                      key={`${m.resourceId}-${m.toId}`}
                      className="flex flex-wrap gap-3 border-b border-[var(--rule)] last:border-0 px-4 py-3"
                    >
                      <span className="w-36 font-medium">{m.callsign}</span>
                      <span className="text-[var(--mute)]">
                        {wardById(m.fromId).name} → {m.toLabel}
                      </span>
                      <span className="flex-1 min-w-[16ch]">{m.why}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[14px] text-[var(--mute)]">No free boats, medical teams, or tankers to move.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CountCard({ label, n, total }: { label: string; n: number; total: number }) {
  return (
    <div className="border border-[var(--ink)] px-4 py-3">
      <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums">
        {n}
        <span className="ml-1 text-[13px] font-normal text-[var(--mute)]">free / {total}</span>
      </p>
    </div>
  );
}
