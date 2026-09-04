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

  return (
    <div className="h-full overflow-auto">
      <header className="px-5 py-4 border-b border-[var(--ink)] flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Dispatch</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-none">Teams</h1>
          <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
            Clerk matches skills, location, equipment, availability, danger on path, and ETA — not nearest-only.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          className="h-9 px-3 border border-[var(--ink)] bg-white text-[13px] disabled:opacity-50"
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
      </header>
      {note && <p className="px-5 py-2 text-[13px] border-b border-[var(--rule)] text-[var(--mute)]">{note}</p>}
      {waiting.length > 0 && (
        <p className="px-5 py-2 text-[13px] border-b border-[var(--rule)]">
          {waiting.length} ticket{waiting.length === 1 ? "" : "s"} waiting for a team
        </p>
      )}
      <ul>
        {ordered.map((r) => {
          const a = assignments.find((x) => x.resourceId === r.id && x.status === "active");
          const inc = incidents.find((i) => i.id === a?.incidentId);
          const cand = inc ? buildCandidates(inc, resources, hazards).find((c) => c.resourceId === r.id) : undefined;
          const why = inc?.aiPick?.reason || a?.reason;
          const loc = wardById(r.locationId).name;
          return (
            <li key={r.id} className="px-5 py-3 border-b border-[var(--rule)]">
              <div className="flex items-center gap-4">
                <span className="w-40 font-medium">{r.callsign}</span>
                <span className={r.status === "free" ? "w-24 text-[var(--ok)]" : "w-24 text-[var(--warn)]"}>
                  {r.status === "free" ? "free" : "out"}
                </span>
                <span className="flex-1 min-w-0 truncate text-[var(--mute)]">
                  {inc ? `${inc.title} · ${a?.etaMin ?? cand?.etaMin} min` : loc}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[var(--mute)]">
                {r.skills.join(", ")}
                {r.equipment.length ? ` · ${r.equipment.join(", ")}` : ""}
                {` · ${loc}`}
                {cand ? ` · danger ${cand.danger}/10` : ""}
              </p>
              {why && <p className="mt-1 text-[14px]">{why}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
