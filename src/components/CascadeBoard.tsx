"use client";

import { useOps } from "@/lib/useOps";

const NODES = [
  { id: "SUB", label: "Substation", x: 18, y: 50 },
  { id: "HOSP", label: "Hospital", x: 48, y: 28 },
  { id: "PUMP", label: "Pumps", x: 48, y: 72 },
  { id: "BTS", label: "Comms", x: 78, y: 28 },
  { id: "SIG", label: "Signals", x: 78, y: 72 },
];

const EDGES: [string, string][] = [
  ["SUB", "HOSP"],
  ["SUB", "PUMP"],
  ["HOSP", "BTS"],
  ["PUMP", "SIG"],
  ["BTS", "SIG"],
];

export function CascadeBoard() {
  const { events } = useOps();
  const hot = events.some((e) => /substation|33kv/i.test(e.rawText));

  return (
    <div className="h-full flex flex-col">
      <header className="px-5 py-4 border-b border-[var(--ink)]">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Infrastructure</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-none">Knock-on</h1>
      </header>
      <svg viewBox="0 0 100 100" className="flex-1 min-h-0 bg-[var(--paper-2)]">
        {EDGES.map(([a, b]) => {
          const n1 = NODES.find((n) => n.id === a)!;
          const n2 = NODES.find((n) => n.id === b)!;
          return <line key={`${a}-${b}`} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke={hot ? "#c42718" : "#1c1612"} strokeWidth={hot ? 1.6 : 0.7} />;
        })}
        {NODES.map((n) => (
          <g key={n.id}>
            <rect x={n.x - 11} y={n.y - 6} width="22" height="12" fill={hot ? "#c42718" : "#efe6d6"} stroke="#1c1612" strokeWidth="0.5" />
            <text x={n.x} y={n.y + 1.2} textAnchor="middle" fill={hot ? "#efe6d6" : "#1c1612"} fontSize="2.6" fontFamily="Poppins, sans-serif">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
