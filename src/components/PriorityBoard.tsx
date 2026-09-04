"use client";

import { useState } from "react";
import { requestPrioritize } from "@/lib/opsRemote";
import { useOps } from "@/lib/useOps";

export function PriorityBoard() {
  const { incidents } = useOps();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [studied, setStudied] = useState(false);

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const data = await requestPrioritize();
      if (!data.ok) {
        setErr("Priority desk failed.");
        return;
      }
      setStudied(Boolean(data.studied));
    } catch {
      setErr("Priority desk failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Life-safety first</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-none">Rank</h1>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className="h-10 px-4 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50"
          >
            {busy ? "Clerk ranking…" : "Ask the clerk"}
          </button>
        </div>
        <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
          Twenty medical evacuations outrank five hundred food kits. Hospital power outranks shelter water. The clerk
          may override heuristic scores.
          {studied ? " Last pass used Featherless." : ""}
        </p>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      <ol className="px-5 py-4">
        {incidents.map((i) => (
          <li key={i.id} className="py-3 border-b border-[var(--rule)] flex gap-4 items-start">
            <span className="w-10 shrink-0 text-center tabular-nums font-semibold">{String(i.rank).padStart(2, "0")}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{i.title}</div>
              <p className="mt-1 text-[14px]">{i.priorityWhy}</p>
              <p className="mt-1 text-[13px] text-[var(--mute)]">
                {i.severity} · score {i.priorityScore}
                {i.heuristicScore != null && i.heuristicScore !== i.priorityScore
                  ? ` (was ${i.heuristicScore})`
                  : ""}
                {i.scoreSource === "ai" ? " · clerk" : " · heuristic"} · {i.verification}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
