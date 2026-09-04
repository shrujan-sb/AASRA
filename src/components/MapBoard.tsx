"use client";

import { ROADS, WARDS } from "@/lib/geo";
import { useOps } from "@/lib/useOps";

export function MapBoard() {
  const { incidents, resources, hazards, assignments } = useOps();
  const blocked = new Set(hazards.filter((h) => h.status === "blocked").map((h) => h.roadId));
  const ward = (id: string) => WARDS.find((w) => w.id === id);

  return (
    <div className="h-full p-2 grid grid-rows-[1fr_auto] gap-2">
      <svg viewBox="0 0 100 100" className="w-full h-full bg-[#080c10] border border-[var(--line)]">
        <text x="2" y="5" fill="#7d8b86" fontSize="3">
          KRISHNA BASIN · VIJAYAWADA SECTOR
        </text>
        {ROADS.map((r) => {
          const a = ward(r.from);
          const b = ward(r.to);
          if (!a || !b) return null;
          const hot = blocked.has(r.id);
          return (
            <g key={r.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={hot ? "#e23d2d" : "#24303a"}
                strokeWidth={hot ? 1.2 : 0.6}
                strokeDasharray={hot ? "2 1" : undefined}
              />
              {hot && (
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 1.5} fill="#e23d2d" fontSize="2.2">
                  BLOCKED {r.id}
                </text>
              )}
            </g>
          );
        })}
        {assignments
          .filter((a) => a.status === "active" || a.status === "rerouted")
          .map((a) => {
            const res = resources.find((r) => r.id === a.resourceId);
            const inc = incidents.find((i) => i.id === a.incidentId);
            const p1 = res && ward(res.locationId);
            const p2 = inc && ward(inc.locationId);
            if (!p1 || !p2) return null;
            return (
              <line
                key={a.id}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={a.status === "rerouted" ? "#e8941a" : "#3a8fd4"}
                strokeWidth="0.5"
                opacity="0.85"
              />
            );
          })}
        {WARDS.map((w) => {
          const hits = incidents.filter((i) => i.locationId === w.id);
          const sev = hits[0]?.severity;
          const fill = sev === "critical" ? "#e23d2d" : sev === "high" ? "#e8941a" : "#3d9b6e";
          return (
            <g key={w.id}>
              <circle cx={w.x} cy={w.y} r={hits.length ? 1.8 : 1.1} fill={hits.length ? fill : "#3a8fd4"} />
              <text x={w.x + 2} y={w.y + 1} fill="#d5ddd8" fontSize="2.1">
                {w.id}
              </text>
            </g>
          );
        })}
        {resources.map((r) => {
          const w = ward(r.locationId);
          if (!w) return null;
          return <rect key={r.id} x={w.x - 3.2} y={w.y - 0.5} width="1" height="1" fill={r.status === "free" ? "#3d9b6e" : "#f07a22"} />;
        })}
      </svg>
      <div className="text-[10px] text-[var(--muted)] flex gap-4 px-1">
        <span>Node = ward · Red dash = blocked road · Cyan line = active assignment · Amber = reroute</span>
        <span className="text-[var(--crit)]">{[...blocked].join(" ") || "no closures"}</span>
      </div>
    </div>
  );
}
