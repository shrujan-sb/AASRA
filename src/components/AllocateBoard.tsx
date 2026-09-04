"use client";

import { useState } from "react";
import { buildCandidates } from "@/lib/dispatch";
import { wardById } from "@/lib/geo";
import { requestAssign } from "@/lib/opsRemote";
import { useOps } from "@/lib/useOps";

export function AllocateBoard() {
  const { assignments, resources, incidents, hazards } = useOps();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const waiting = incidents.filter((i) => i.status === "open" || i.status === "rerouted");
  const ordered = [...resources].sort((a, b) => {
    const ao = a.status === "free" ? 1 : 0;
    const bo = b.status === "free" ? 1 : 0;
    return ao - bo;
  });
  const out = resources.filter((r) => r.status !== "free").length;

  return (
    <div className="h-full min-h-0 grid grid-rows-[auto_1fr]">
      <header className="ops-head flex items-end justify-between gap-4">
        <div>
          <p className="ops-kicker">Dispatch</p>
          <h1>Teams</h1>
          <p className="mt-1.5 max-w-[62ch] text-[13px] text-[var(--mute)]">
            Clerk matches skills, location, equipment, availability, danger on path, and ETA — not nearest-only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="ops-chip ops-chip-warn">{waiting.length} waiting</span>
          <span className="ops-chip ops-chip-ok">{resources.length - out} free</span>
          <button
            type="button"
            disabled={busy}
            className="h-8 px-3 border border-[var(--ink)] bg-white text-[13px] disabled:opacity-50"
            onClick={() => {
              setBusy(true);
              setNote("");
              void requestAssign()
                .then((res) => {
                  setNote(
                    res.ok
                      ? res.studied
                        ? "Clerk matched units to tickets."
                        : "Desk heuristic matched units (clerk unavailable)."
                      : "Could not assign teams.",
                  );
                })
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Clerk matching…" : "Ask clerk"}
          </button>
        </div>
      </header>
      {note && <p className="px-4 py-1.5 text-[13px] border-b border-[var(--rule)] text-[var(--mute)]">{note}</p>}

      <div className="min-h-0 grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="min-h-0 overflow-auto border-b lg:border-b-0 lg:border-r border-[var(--ink)] bg-[var(--paper)] p-4 space-y-2">
          <p className="ops-kicker">Queue</p>
          {waiting.length === 0 && <p className="mt-2 text-[13px] text-[var(--mute)]">No tickets waiting.</p>}
          {waiting.map((i) => (
            <article key={i.id} className="ops-dossier" data-sev={i.severity}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium leading-snug">{i.title}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--mute)]">{i.locationLabel}</p>
                </div>
                <span className={`ops-chip ops-chip-${i.severity}`}>
                  {i.severity === "high" ? "urgent" : i.severity}
                </span>
              </div>
              {i.reason && <p className="mt-1.5 text-[13px] leading-snug">{i.reason.decision || i.reason.summary}</p>}
              {i.aiPick && <p className="mt-1 text-[12px]">Pick: {i.aiPick.callsign}</p>}
            </article>
          ))}
        </section>

        <section className="min-h-0 overflow-auto p-4">
          <p className="ops-kicker mb-2">Units</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {ordered.map((r) => {
              const a = assignments.find((x) => x.resourceId === r.id && x.status === "active");
              const inc = incidents.find((i) => i.id === a?.incidentId);
              const cand = inc ? buildCandidates(inc, resources, hazards).find((c) => c.resourceId === r.id) : undefined;
              const why = inc?.aiPick?.reason || a?.reason;
              const loc = wardById(r.locationId).name;
              return (
                <article key={r.id} className="ops-dossier" data-sev={inc?.severity}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold leading-none">{r.callsign}</p>
                      <p className="mt-1 text-[12px] text-[var(--mute)]">{loc}</p>
                    </div>
                    <span className={r.status === "free" ? "ops-chip ops-chip-ok" : "ops-chip ops-chip-warn"}>
                      {r.status === "free" ? "free" : "out"}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] text-[var(--mute)]">
                    {r.skills.join(", ")}
                    {r.equipment.length ? ` · ${r.equipment.join(", ")}` : ""}
                    {cand ? ` · danger ${cand.danger}/10` : ""}
                  </p>
                  {inc && (
                    <p className="mt-1.5 text-[13px]">
                      {inc.title} · {a?.etaMin ?? cand?.etaMin} min
                    </p>
                  )}
                  {why && <p className="mt-1 text-[13px] leading-snug">{why}</p>}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
