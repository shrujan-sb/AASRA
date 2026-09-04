"use client";

import { useOps } from "@/lib/useOps";

export function AllocateBoard() {
  const { assignments, resources, incidents } = useOps();
  return (
    <div className="h-full overflow-auto">
      <header className="px-5 py-4 border-b border-[var(--ink)]">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Dispatch</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-none">Teams</h1>
      </header>
      <ul>
        {resources.map((r) => {
          const a = assignments.find((x) => x.resourceId === r.id && x.status === "active");
          const inc = incidents.find((i) => i.id === a?.incidentId);
          return (
            <li key={r.id} className="flex items-center gap-4 px-5 py-3 border-b border-[var(--rule)]">
              <span className="w-40 font-medium">{r.callsign}</span>
              <span className={r.status === "free" ? "w-24 text-[var(--ok)]" : "w-24 text-[var(--warn)]"}>
                {r.status === "free" ? "free" : "out"}
              </span>
              <span className="flex-1 min-w-0 truncate text-[var(--mute)]">
                {inc ? `${inc.title} · ${a?.etaMin} min` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
