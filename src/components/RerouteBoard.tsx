"use client";

import { useState } from "react";
import { injectRoadBlock } from "@/lib/pipeline";
import { requestReroute } from "@/lib/opsRemote";
import { useOps } from "@/lib/useOps";

export function RerouteBoard() {
  const { assignments, incidents, hazards, resources } = useOps();
  const [road, setRoad] = useState("NH-16");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [headline, setHeadline] = useState("");
  const [alts, setAlts] = useState<string[]>([]);
  const [studied, setStudied] = useState(false);

  const blocked = hazards.filter((h) => h.status === "blocked");
  const moved = assignments.filter((a) => a.status === "rerouted" || a.status === "active");

  async function run(inject: boolean) {
    setBusy(true);
    setErr("");
    try {
      const data = inject ? await injectRoadBlock(road) : await requestReroute(road);
      if (!data.ok) {
        setErr("Reroute desk failed.");
        return;
      }
      setHeadline(data.headline || "Corridor update applied.");
      setAlts(data.alternatives ?? []);
      setStudied(Boolean(data.studied));
    } catch {
      setErr("Reroute desk failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Closed corridors</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-none">Reroute</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={road}
              onChange={(e) => setRoad(e.target.value)}
              className="h-10 px-3 border border-[var(--ink)] bg-white text-[14px] w-44"
              aria-label="Corridor name"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(false)}
              className="h-10 px-4 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50"
            >
              {busy ? "Clerk rerouting…" : "Reroute now"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(true)}
              className="h-10 px-3 border border-[var(--ink)] bg-white text-[13px] disabled:opacity-50"
            >
              Inject block
            </button>
          </div>
        </div>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      <div className="px-5 py-5 space-y-6">
        <section className="border border-[var(--ink)] bg-[var(--paper-2)] px-4 py-4">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
            {blocked.length} blocked
            {studied ? " · clerk" : ""}
          </p>
          <p className="mt-2 text-[20px] font-semibold leading-snug">
            {headline || "When a corridor closes, the clerk names hit missions, alternatives, and new ETAs."}
          </p>
          {alts.length > 0 && (
            <ul className="mt-2 text-[14px] space-y-1">
              {alts.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Hazards</p>
          <ul className="mt-2 border border-[var(--ink)] bg-white">
            {blocked.length === 0 ? (
              <li className="px-4 py-3 text-[var(--mute)]">No blocked corridors on the board.</li>
            ) : (
              blocked.map((h) => (
                <li key={h.id} className="px-4 py-3 border-b border-[var(--rule)] last:border-0">
                  <span className="font-semibold">{h.label}</span>
                  <span className="text-[var(--mute)]"> · {h.roadId}</span>
                  <span className="ops-tag ops-tag-conflicting ml-2">{h.status}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Missions</p>
          <ul className="mt-2 border border-[var(--ink)] bg-white">
            {moved.slice(0, 16).map((a) => {
              const inc = incidents.find((i) => i.id === a.incidentId);
              const unit = resources.find((r) => r.id === a.resourceId);
              return (
                <li key={a.id} className="px-4 py-3 border-b border-[var(--rule)] last:border-0">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{inc?.title ?? a.incidentId}</span>
                    <span className="text-[13px] text-[var(--mute)]">{a.status}</span>
                  </div>
                  <p className="mt-1 text-[14px] text-[var(--mute)]">
                    {unit?.callsign ?? a.resourceId} · {a.etaMin} min · {a.viaRoadIds.join(" / ") || "no road ids"}
                  </p>
                  {a.reason ? <p className="mt-1 text-[14px]">{a.reason}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
