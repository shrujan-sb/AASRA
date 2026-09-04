"use client";

import { useOps } from "@/lib/useOps";

export function AllocateBoard() {
  const { assignments, resources, incidents } = useOps();
  return (
    <div className="h-full overflow-auto px-6 md:px-10 py-8">
      <h2 className="text-4xl font-semibold">
        Who is <span className="mark text-6xl text-[var(--crit)]">committed</span>
      </h2>
      <table className="mt-8 w-full text-left text-lg">
        <thead>
          <tr className="border-b-2 border-[var(--rule)] text-[var(--mute)]">
            <th className="py-3 pr-4 font-medium">Unit</th>
            <th className="py-3 pr-4 font-medium">Kind</th>
            <th className="py-3 pr-4 font-medium">Pool</th>
            <th className="py-3 pr-4 font-medium">Need</th>
            <th className="py-3 pr-4 font-medium">ETA</th>
            <th className="py-3 font-medium">Why this unit</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => {
            const a = assignments.find((x) => x.resourceId === r.id && x.status !== "cancelled");
            const inc = incidents.find((i) => i.id === a?.incidentId);
            const pool = r.status === "free" ? "free" : "committed";
            return (
              <tr key={r.id} className="border-b border-[var(--rule)] flash-in align-top">
                <td className="py-5 pr-4 font-semibold">{r.callsign}</td>
                <td className="py-5 pr-4">{r.kind}</td>
                <td className="py-5 pr-4">
                  {pool === "free" ? <span className="text-[var(--ok)]">free</span> : <span className="mark text-3xl text-[var(--warn)]">committed</span>}
                </td>
                <td className="py-5 pr-4">{inc?.title ?? "—"}</td>
                <td className="py-5 pr-4 tabular-nums">{a ? `${a.etaMin} min` : "—"}</td>
                <td className="py-5 max-w-xl">
                  {a?.status === "rerouted" && <span className="mark text-3xl text-[var(--crit)] mr-2">reroute</span>}
                  {a?.reason ?? "Standing by."}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
