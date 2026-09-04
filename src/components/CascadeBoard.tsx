"use client";

import { useOps } from "@/lib/useOps";

const NODES = [
  { id: "SUB", label: "33kV Substation", x: 18, y: 50, fail: "substation" },
  { id: "HOSP", label: "GGH Hospital", x: 42, y: 28, fail: "hospital" },
  { id: "PUMP", label: "Ward 7 pumps", x: 42, y: 72, fail: "water" },
  { id: "BTS", label: "Cellular BTS", x: 70, y: 28, fail: "comms" },
  { id: "SIG", label: "Traffic signals", x: 70, y: 72, fail: "signals" },
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
    <div className="h-full p-2 grid grid-rows-[auto_1fr] gap-2">
      <div className="text-[11px] text-[var(--muted)]">
        Dependency graph. Substation failure fans into hospital power, water pumps, comms, then signals.
        {road ? " Road closures compound ambulance ETAs." : ""}
      </div>
      <svg viewBox="0 0 100 100" className="w-full h-full bg-[#080c10] border border-[var(--line)]">
        {EDGES.map(([a, b]) => {
          const n1 = NODES.find((n) => n.id === a)!;
          const n2 = NODES.find((n) => n.id === b)!;
          const on = hot.has(a) && hot.has(b);
          return (
            <line
              key={`${a}-${b}`}
              x1={n1.x}
              y1={n1.y}
              x2={n2.x}
              y2={n2.y}
              stroke={on ? "#e23d2d" : "#24303a"}
              strokeWidth={on ? 1.4 : 0.7}
            />
          );
        })}
        {NODES.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x - 12}
              y={n.y - 6}
              width="24"
              height="12"
              fill={hot.has(n.id) ? "#3a1512" : "#10161c"}
              stroke={hot.has(n.id) ? "#e23d2d" : "#3a8fd4"}
              strokeWidth="0.5"
            />
            <text x={n.x} y={n.y + 1} textAnchor="middle" fill="#d5ddd8" fontSize="2.4">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
