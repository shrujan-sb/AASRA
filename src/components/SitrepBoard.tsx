"use client";

import { useState } from "react";
import { requestSitrep } from "@/lib/opsRemote";
import { useOps } from "@/lib/useOps";

export function SitrepBoard() {
  const { sitrep, incidents, hazards } = useOps();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [studied, setStudied] = useState(false);

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const data = await requestSitrep(sitrep?.tick ?? 0);
      if (!data.ok) {
        setErr("Sitrep desk failed.");
        return;
      }
      setStudied(Boolean(data.studied));
    } catch {
      setErr("Sitrep desk failed.");
    } finally {
      setBusy(false);
    }
  }

  const blocked = hazards.filter((h) => h.status === "blocked").length;
  const open = incidents.filter((i) => i.status !== "resolved").length;

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Duty brief</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-none">Sitrep</h1>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className="h-10 px-4 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50"
          >
            {busy ? "Clerk writing…" : sitrep?.headline ? "Write again" : "Ask the clerk"}
          </button>
        </div>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      {!sitrep ? (
        <p className="px-5 py-8 max-w-[62ch] text-[16px] text-[var(--mute)]">
          The clerk compiles what is still open, what moved, and what knock-on hazards remain.
        </p>
      ) : (
        <div className="px-5 py-5 space-y-6">
          <section className="border border-[var(--ink)] bg-[var(--paper-2)] px-4 py-4">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
              tick {sitrep.tick}
              {studied || sitrep.model
                ? sitrep.model
                  ? ` · ${sitrep.model}`
                  : " · clerk"
                : sitrep.fallback
                  ? " · desk heuristic"
                  : ""}
            </p>
            <p className="mt-2 text-[20px] font-semibold leading-snug">{sitrep.headline}</p>
            {sitrep.predictedShortage ? (
              <p className="mt-2 text-[15px] leading-snug">{sitrep.predictedShortage}</p>
            ) : null}
          </section>

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--ink)] border border-[var(--ink)]">
            <Stat n={sitrep.activeIncidents || open} label="active" />
            <Stat n={sitrep.critical} label="life-safety" alert={sitrep.critical > 0} />
            <Stat n={sitrep.roadsBlocked || blocked} label="roads blocked" alert={blocked > 0} />
            <Stat n={sitrep.sheltersNearCapacity} label="shelters tight" />
          </section>

          <section>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Units</p>
            <p className="mt-1 text-[15px]">
              {sitrep.freeUnits} free · {sitrep.assignedUnits} committed
            </p>
          </section>

          {sitrep.predictions.length > 0 && (
            <section>
              <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Knock-on</p>
              <ul className="mt-2 border border-[var(--ink)] bg-white">
                {sitrep.predictions.map((p) => (
                  <li key={p} className="px-4 py-3 border-b border-[var(--rule)] last:border-0 text-[15px]">
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ n, label, alert }: { n: number; label: string; alert?: boolean }) {
  return (
    <div className="bg-[var(--paper)] px-4 py-3">
      <div className={`text-[22px] font-semibold tabular-nums ${alert ? "text-[var(--crit)]" : ""}`}>{n}</div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--mute)]">{label}</div>
    </div>
  );
}
