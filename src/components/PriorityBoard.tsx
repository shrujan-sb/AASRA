"use client";

import { useEffect, useState } from "react";
import { requestPrioritize } from "@/lib/opsRemote";
import { rankOpenIncidents } from "@/lib/instantPriority";
import { useOps } from "@/lib/useOps";

export function PriorityBoard() {
  const { incidents } = useOps();
  const [err, setErr] = useState("");
  const rows = rankOpenIncidents(incidents);

  useEffect(() => {
    void requestPrioritize().catch(() => setErr("Priority desk failed."));
  }, []);

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Life-safety first</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-none">Rank</h1>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>
      <ol className="px-5 py-4">
        {rows.map((i) => (
          <li key={i.id} className="py-3 border-b border-[var(--rule)] flex gap-4 items-start">
            <span className="w-10 shrink-0 text-center tabular-nums font-semibold">
              {String(i.rank || 0).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{i.title}</div>
              {i.priorityWhy ? <p className="mt-1 text-[14px]">{i.priorityWhy}</p> : null}
              <p className="mt-1 text-[13px] text-[var(--mute)]">
                {i.severity} · {i.priorityScore}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
