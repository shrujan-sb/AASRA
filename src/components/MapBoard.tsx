"use client";

import { useMemo, useState } from "react";
import { ROADS, WARDS } from "@/lib/geo";
import { injectRoadBlock } from "@/lib/pipeline";
import { useOps } from "@/lib/useOps";

function xy(n: number, axis: "x" | "y") {
  return axis === "x" ? 40 + n * 5.6 : 28 + n * 3.6;
}

export function MapBoard() {
  const { incidents, resources, hazards, assignments, logs } = useOps();
  const blocked = useMemo(
    () => new Set(hazards.filter((h) => h.status === "blocked").map((h) => h.roadId)),
    [hazards],
  );
  const [sel, setSel] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const ward = (id: string) => WARDS.find((w) => w.id === id);
  const chosen = WARDS.find((w) => w.id === sel);
  const here = incidents.filter((i) => i.locationId === sel);
  const units = resources.filter((r) => r.locationId === sel);
  const routeLogs = logs.filter((l) => l.agent === "routing").slice(0, 6);
  const hot = here.find((i) => i.severity === "critical") ?? here[0];

  return (
    <div className="h-full grid lg:grid-cols-[1fr_300px] min-h-0">
      <div className="px-5 py-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <p className="ops-kicker">Ground</p>
            <h1 className="text-[22px] font-semibold leading-none">Map</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="ops-chip ops-chip-critical">{blocked.size} closed</span>
            <button
              type="button"
              disabled={closing}
              className="h-8 px-3 bg-[var(--crit)] text-[var(--paper)] text-[13px] disabled:opacity-50"
              onClick={() => {
                setClosing(true);
                void injectRoadBlock("NH-16")
                  .then((r) => setNote(r.headline || "NH-16 closed — missions rechecked."))
                  .finally(() => setClosing(false));
              }}
            >
              {closing ? "Rerouting…" : "Close NH-16"}
            </button>
          </div>
        </div>
        {note && <p className="mb-2 text-[13px]">{note}</p>}
        <svg viewBox="0 0 640 420" className="flex-1 min-h-[320px] w-full bg-[var(--paper-2)] border border-[var(--ink)]">
          <rect x="0" y="340" width="640" height="80" fill="#8aa4b0" />
          <text x="16" y="372" fill="#efe6d6" fontSize="14" fontFamily="Poppins, sans-serif">
            Krishna river
          </text>

          {ROADS.map((r) => {
            const a = ward(r.from);
            const b = ward(r.to);
            if (!a || !b) return null;
            const isHot = blocked.has(r.id);
            const x1 = xy(a.x, "x");
            const y1 = xy(a.y, "y");
            const x2 = xy(b.x, "x");
            const y2 = xy(b.y, "y");
            return (
              <g key={r.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isHot ? "#c42718" : "#1c1612"} strokeWidth={isHot ? 5 : 2} />
                <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} fill={isHot ? "#c42718" : "#5c5348"} fontSize="11" fontFamily="Poppins, sans-serif" textAnchor="middle">
                  {isHot ? `Closed · ${r.name}` : r.name}
                </text>
              </g>
            );
          })}

          {assignments
            .filter((a) => a.status === "active")
            .map((a) => {
              const res = resources.find((r) => r.id === a.resourceId);
              const inc = incidents.find((i) => i.id === a.incidentId);
              const p1 = res && ward(res.locationId);
              const p2 = inc && ward(inc.locationId);
              if (!p1 || !p2) return null;
              return (
                <line
                  key={a.id}
                  x1={xy(p1.x, "x")}
                  y1={xy(p1.y, "y")}
                  x2={xy(p2.x, "x")}
                  y2={xy(p2.y, "y")}
                  stroke="#163a48"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
              );
            })}

          {WARDS.map((w) => {
            const hit = incidents.find((i) => i.locationId === w.id);
            const fill = hit?.severity === "critical" ? "#c42718" : hit?.severity === "high" ? "#b45309" : hit ? "#1f6b4a" : "#1c1612";
            const cx = xy(w.x, "x");
            const cy = xy(w.y, "y");
            const on = sel === w.id;
            return (
              <g key={w.id} onClick={() => setSel(w.id)} style={{ cursor: "pointer" }}>
                <circle cx={cx} cy={cy} r={on ? 11 : 8} fill={fill} stroke="#efe6d6" strokeWidth="2" />
                <text x={cx + 14} y={cy + 4} fill="#1c1612" fontSize="12" fontFamily="Poppins, sans-serif">
                  {w.id}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-[var(--mute)]">
          <span>
            <i className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--crit)] mr-1" />
            critical
          </span>
          <span>
            <i className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--warn)] mr-1" />
            urgent
          </span>
          <span>
            <i className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--ok)] mr-1" />
            need
          </span>
          <span>Dashed = team moving</span>
        </div>
      </div>

      <aside className="border-t lg:border-t-0 lg:border-l border-[var(--ink)] bg-[var(--paper)] overflow-auto p-4">
        <p className="ops-kicker">Click a ward</p>
        <h2 className="text-[18px] font-semibold mt-1">{chosen?.name ?? "Sector"}</h2>
        <div className="mt-3 ops-dossier" data-sev={hot?.severity}>
          <div className="flex justify-between gap-2">
            <span className="text-[12px] text-[var(--mute)]">{sel ?? "—"}</span>
            {hot && (
              <span className={`ops-chip ops-chip-${hot.severity}`}>
                {hot.severity === "high" ? "urgent" : hot.severity}
              </span>
            )}
          </div>
          {here.length === 0 && <p className="mt-2 text-[13px] text-[var(--mute)]">No open need here.</p>}
          <ul className="mt-2 space-y-2">
            {here.map((i) => (
              <li key={i.id} className="border-t border-[var(--rule)] pt-2 first:border-0 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-[14px] leading-snug">{i.title}</span>
                  <span className={`ops-chip ops-chip-${i.severity}`}>
                    {i.severity === "high" ? "urgent" : i.severity}
                  </span>
                </div>
                {i.reason && <p className="mt-1 text-[13px] leading-snug">{i.reason.decision || i.reason.summary}</p>}
                {i.aiPick && !i.reason && <p className="mt-1 text-[12px] text-[var(--mute)]">{i.aiPick.reason}</p>}
              </li>
            ))}
          </ul>
          {units.length > 0 && (
            <ul className="mt-3 border-t border-[var(--rule)] pt-2 space-y-1">
              {units.map((u) => (
                <li key={u.id} className="text-[13px] flex justify-between gap-2">
                  <span>{u.callsign}</span>
                  <span className={u.status === "free" ? "ops-chip ops-chip-ok" : "ops-chip ops-chip-warn"}>{u.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {routeLogs.length > 0 && (
          <div className="mt-3 ops-dossier">
            <p className="ops-kicker">Reroute desk</p>
            <ul className="mt-2 space-y-1.5">
              {routeLogs.map((l) => (
                <li key={l.id} className="text-[13px] leading-snug">
                  {l.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
