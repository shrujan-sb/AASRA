"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { injectRoadBlock } from "@/lib/pipeline";
import { useOps } from "@/lib/useOps";

const OpsEmergenciesMap = dynamic(
  () => import("@/components/OpsEmergenciesMap").then((m) => m.OpsEmergenciesMap),
  { ssr: false },
);

export function MapBoard() {
  const { incidents, resources, hazards, assignments, logs } = useOps();
  const open = useMemo(() => incidents.filter((i) => i.status !== "resolved"), [incidents]);
  const blocked = useMemo(
    () => new Set(hazards.filter((h) => h.status === "blocked").map((h) => h.roadId)),
    [hazards],
  );
  const [sel, setSel] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const current = open.find((i) => i.id === sel) ?? open[0] ?? null;
  const units = current ? resources.filter((r) => r.locationId === current.locationId) : [];
  const routeLogs = logs.filter((l) => l.agent === "routing").slice(0, 6);
  const match = assignments.find((a) => a.incidentId === current?.id && a.status === "active");

  return (
    <div className="h-full grid lg:grid-cols-[1fr_300px] min-h-0">
      <div className="px-5 py-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <p className="ops-kicker">Ground</p>
            <h1 className="text-[22px] font-semibold leading-none">Map</h1>
            <p className="mt-1 text-[13px] text-[var(--mute)]">Pins follow live tickets. Map opens on your GPS.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="ops-chip ops-chip-critical">{open.length} live</span>
            <span className="ops-chip ops-chip-warn">{blocked.size} closed</span>
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
        <div className="relative z-0 flex-1 min-h-[360px] isolate overflow-hidden border border-[var(--ink)]">
          <OpsEmergenciesMap incidents={open} selectedId={current?.id ?? null} onSelect={setSel} />
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-[var(--mute)]">
          <span>
            <i className="inline-block w-2.5 h-2.5 bg-[var(--crit)] mr-1" />
            critical
          </span>
          <span>
            <i className="inline-block w-2.5 h-2.5 bg-[var(--warn)] mr-1" />
            urgent
          </span>
          <span>
            <i className="inline-block w-2.5 h-2.5 bg-[var(--ok)] mr-1" />
            routine
          </span>
        </div>
      </div>

      <aside className="border-t lg:border-t-0 lg:border-l border-[var(--ink)] bg-[var(--paper)] overflow-auto p-4">
        <p className="ops-kicker">Emergencies</p>
        <h2 className="text-[18px] font-semibold mt-1">{open.length} on the ground</h2>
        <ul className="mt-3 space-y-2">
          {open.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => setSel(i.id)}
                className={`w-full text-left px-3 py-2 border border-[var(--ink)] ${
                  current?.id === i.id ? "bg-white" : "bg-transparent"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-[14px] leading-snug">{i.title}</span>
                  <span className={`ops-chip ops-chip-${i.severity}`}>
                    {i.severity === "high" ? "urgent" : i.severity}
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-[var(--mute)]">{i.locationLabel}</div>
              </button>
            </li>
          ))}
        </ul>
        {current && (
          <div className="mt-4 ops-dossier" data-sev={current.severity}>
            <p className="text-[12px] text-[var(--mute)]">{current.id}</p>
            <p className="font-semibold leading-snug">{current.title}</p>
            {current.reason && (
              <p className="mt-2 text-[13px] leading-snug">{current.reason.decision || current.reason.summary}</p>
            )}
            {match && <p className="mt-2 text-[13px] text-[var(--mute)]">{match.reason}</p>}
            {units.length > 0 && (
              <ul className="mt-2 space-y-1">
                {units.map((u) => (
                  <li key={u.id} className="text-[13px] flex justify-between gap-2">
                    <span>{u.callsign}</span>
                    <span>{u.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
