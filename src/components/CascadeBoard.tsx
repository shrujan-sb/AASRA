"use client";

import { useOps } from "@/lib/useOps";

const NODES = [
  { id: "SUB", label: "33kV substation", x: 16, y: 50 },
  { id: "HOSP", label: "GGH hospital", x: 42, y: 24 },
  { id: "PUMP", label: "Ward 7 pumps", x: 42, y: 76 },
  { id: "BTS", label: "Cellular BTS", x: 72, y: 24 },
  { id: "SIG", label: "Traffic signals", x: 72, y: 76 },
];

const EDGES: [string, string][] = [
  ["SUB", "HOSP"],
  ["SUB", "PUMP"],
  ["HOSP", "BTS"],
  ["PUMP", "SIG"],
  ["BTS", "SIG"],
];

export function CascadeBoard() {
  const { events, hazards } = useOps();
  const subHit = events.some((e) => /substation|33kv/i.test(e.rawText));
  const hot = new Set<string>();
  if (subHit) {
    hot.add("SUB");
    hot.add("HOSP");
    hot.add("PUMP");
    hot.add("BTS");
    hot.add("SIG");
  }
  const road = hazards.some((h) => h.status === "blocked");

  return (
    <div className="h-full overflow-auto px-6 md:px-10 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-4xl font-semibold">
          If this <span className="mark text-6xl text-[var(--crit)]">fails</span>
        </h2>
        <p className="mt-3 max-w-3xl text-xl text-[var(--mute)]">
          Substation loss fans into hospital power, water pumps, comms, then signals.
          {road ? " Road closures make ambulance ETAs worse." : ""}
        </p>
      </div>
      <svg viewBox="0 0 100 100" className="w-full flex-1 min-h-[420px] bg-[var(--paper-2)]">
        {EDGES.map(([a, b]) => {
          const n1 = NODES.find((n) => n.id === a)!;
          const n2 = NODES.find((n) => n.id === b)!;
          const on = hot.has(a) && hot.has(b);
          return (
            <line key={`${a}-${b}`} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke={on ? "#c42718" : "#1c1612"} strokeWidth={on ? 1.8 : 0.8} />
          );
        })}
        {NODES.map((n) => (
          <g key={n.id}>
            <rect x={n.x - 14} y={n.y - 7} width="28" height="14" fill={hot.has(n.id) ? "#c42718" : "#efe6d6"} stroke="#1c1612" strokeWidth="0.6" />
            <text x={n.x} y={n.y + 1.4} textAnchor="middle" fill={hot.has(n.id) ? "#efe6d6" : "#1c1612"} fontSize="2.8" fontFamily="Poppins, sans-serif">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
