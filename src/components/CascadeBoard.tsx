"use client";

import { useEffect, useState } from "react";
import { requestRepairs } from "@/lib/opsRemote";
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
  const { events, hazards, infra } = useOps();
  const hot = events.some((e) => /substation|33kv/i.test(e.rawText));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const blocked = hazards.filter((h) => h.status === "blocked").length;

  useEffect(() => {
    void requestRepairs();
  }, []);

  return (
    <div className="h-full min-h-0 grid lg:grid-cols-[minmax(0,0.85fr)_minmax(340px,1.15fr)]">
      <div className="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-[var(--ink)]">
        <header className="ops-head">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="ops-kicker">Infrastructure</p>
              <h1>Knock-on</h1>
            </div>
            <div className="flex gap-1.5">
              {hot ? <span className="ops-chip ops-chip-critical">grid hot</span> : <span className="ops-chip ops-chip-ok">grid calm</span>}
              <span className="ops-chip ops-chip-warn">{blocked} roads</span>
            </div>
          </div>
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
      <section className="min-h-0 overflow-auto bg-[var(--paper)]">
        <header className="ops-head bg-[var(--paper)] flex items-end justify-between gap-3">
          <div>
            <p className="ops-kicker">Repair order</p>
            <h1 className="text-[18px]">Roads & bridges</h1>
          </div>
          <button
            type="button"
            disabled={busy}
            className="h-8 px-3 text-[13px] border border-[var(--ink)] bg-white disabled:opacity-50"
            onClick={() => {
              setBusy(true);
              setErr("");
              void requestRepairs()
                .then((data) => {
                  if (!data.ok) setErr("Repair desk failed.");
                })
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Ranking…" : "Rank again"}
          </button>
        </header>
        {err ? <p className="px-4 py-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
        <ol className="p-4 space-y-2">
          {infra.map((row) => (
            <li key={row.id} className="ops-dossier" data-sev={row.status === "blocked" ? "critical" : row.status === "damaged" ? "high" : undefined}>
              <div className="flex justify-between gap-3 items-start">
                <div>
                  <span className="tabular-nums text-[var(--mute)] mr-2">{String(row.rank || 0).padStart(2, "0")}</span>
                  <span className="font-medium">{row.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={
                      row.status === "blocked"
                        ? "ops-chip ops-chip-critical"
                        : row.status === "damaged"
                          ? "ops-chip ops-chip-high"
                          : "ops-chip ops-chip-ok"
                    }
                  >
                    {row.status}
                  </span>
                  <span className="tabular-nums text-[12px] text-[var(--mute)]">{row.score}</span>
                </div>
              </div>
              {row.reason && <p className="mt-1.5 text-[13px] leading-snug">{row.reason}</p>}
              {row.consequences.length > 0 && (
                <ul className="mt-1.5 list-disc pl-4 text-[12px] text-[var(--mute)] space-y-0.5">
                  {row.consequences.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
        {infra.length === 0 && <p className="px-4 py-6 text-[var(--mute)]">No infrastructure file yet.</p>}
      </section>
    </div>
  );
}
