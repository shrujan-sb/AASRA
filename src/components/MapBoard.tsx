"use client";

import { ROADS, WARDS } from "@/lib/geo";
import { injectRoadBlock } from "@/lib/pipeline";
import { useOps } from "@/lib/useOps";

export function MapBoard() {
  const { incidents, resources, hazards, assignments } = useOps();
  const blocked = new Set(hazards.filter((h) => h.status === "blocked").map((h) => h.roadId));
  const ward = (id: string) => WARDS.find((w) => w.id === id);

  return (
    <div className="h-full overflow-auto px-6 md:px-10 py-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-4xl font-semibold">
          Sector <span className="mark text-6xl text-[var(--crit)]">map</span>
        </h2>
        <button
          type="button"
          className="h-12 px-5 bg-[var(--crit)] text-[var(--paper)] text-lg font-medium"
          onClick={() => void injectRoadBlock("NH-16")}
        >
          Block NH-16 now
        </button>
      </div>
      <svg viewBox="0 0 100 100" className="w-full flex-1 min-h-[480px] bg-[var(--paper-2)]">
        <text x="3" y="7" fill="#1c1612" fontSize="3.2" fontFamily="Poppins, sans-serif">
          Vijayawada · Krishna basin
        </text>
        {ROADS.map((r) => {
          const a = ward(r.from);
          const b = ward(r.to);
          if (!a || !b) return null;
          const hot = blocked.has(r.id);
          return (
            <g key={r.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot ? "#c42718" : "#1c1612"} strokeWidth={hot ? 1.6 : 0.7} />
              {hot && (
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 2} fill="#c42718" fontSize="3.4" fontFamily="Poppins, sans-serif">
                  blocked
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
                stroke={a.status === "rerouted" ? "#b45309" : "#163a48"}
                strokeWidth="0.9"
              />
            );
          })}
        {WARDS.map((w) => {
          const hits = incidents.filter((i) => i.locationId === w.id);
          const sev = hits[0]?.severity;
          const fill = sev === "critical" ? "#c42718" : sev === "high" ? "#b45309" : hits.length ? "#1f6b4a" : "#1c1612";
          return (
            <g key={w.id}>
              <circle cx={w.x} cy={w.y} r={hits.length ? 2.2 : 1.4} fill={fill} />
              <text x={w.x + 2.4} y={w.y + 1.2} fill="#1c1612" fontSize="2.6" fontFamily="Poppins, sans-serif">
                {w.id}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-lg">
        Closures:{" "}
        <span className="mark text-4xl text-[var(--crit)]">{[...blocked].join(" ") || "none"}</span>
        <span className="text-[var(--mute)]"> · ink line = corridor · river line = assignment · ochre = reroute</span>
      </p>
    </div>
  );
}
