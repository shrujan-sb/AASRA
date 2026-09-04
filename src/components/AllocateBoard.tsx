"use client";

import { useOps } from "@/lib/useOps";

export function AllocateBoard() {
  const { assignments, resources, incidents } = useOps();
  return (
    <div className="h-full p-2 overflow-auto">
      <table className="w-full text-[11px] border border-[var(--line)]">
        <thead className="bg-[var(--panel)] text-[var(--muted)] text-left tracking-widest">
          <tr>
            <th className="px-2 py-1">UNIT</th>
            <th>KIND</th>
            <th>POOL</th>
            <th>NEED</th>
            <th>ETA</th>
            <th>VIA</th>
            <th>REASONING</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => {
            const a = assignments.find((x) => x.resourceId === r.id && x.status !== "cancelled");
            const inc = incidents.find((i) => i.id === a?.incidentId);
            const pool = r.status === "free" ? "FREE" : r.status === "assigned" ? "COMMITTED" : r.status.toUpperCase();
            return (
              <tr key={r.id} className="border-t border-[var(--line)] bg-[var(--panel)] flash-in">
                <td className="px-2 py-2">{r.callsign}</td>
                <td>{r.kind}</td>
                <td className={r.status === "free" ? "text-[var(--ok)]" : "text-[var(--high)]"}>{pool}</td>
                <td>{inc?.title ?? "—"}</td>
                <td>{a ? `${a.etaMin}m` : "—"}</td>
                <td>{a?.viaRoadIds.join(",") || "—"}</td>
                <td className="text-[var(--info)] max-w-[420px]">{a?.reason ?? "Uncommitted — standing by"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
