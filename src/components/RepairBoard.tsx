"use client";

import { useState } from "react";
import { requestRepairs } from "@/lib/opsRemote";
import { useOps } from "@/lib/useOps";

export function RepairBoard() {
  const { infra, hazards } = useOps();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [studied, setStudied] = useState(false);
  const [model, setModel] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const data = await requestRepairs();
      if (!data.ok) {
        setErr("Repair desk failed.");
        return;
      }
      setStudied(Boolean(data.studied));
      setModel(data.model || "");
    } catch {
      setErr("Repair desk failed.");
    } finally {
      setBusy(false);
    }
  }

  const ranked = [...infra].sort((a, b) => (a.rank || 99) - (b.rank || 99) || b.score - a.score);
  const first = ranked[0];
  const blocked = hazards.filter((h) => h.status === "blocked").length;
  const clerkModel = ranked.find((r) => r.model)?.model || model;

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Roads & bridges</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-none">Repair</h1>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className="h-10 px-4 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50"
          >
            {busy ? "Clerk ranking…" : ranked.some((r) => r.score) ? "Rank again" : "Ask the clerk"}
          </button>
        </div>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      {!ranked.length ? (
        <div className="px-5 py-8 max-w-[62ch]">
          <p className="text-[16px] leading-relaxed text-[var(--mute)]">
            Damaged roads, bridges, and flyovers. The clerk ranks repair order from damage, traffic, hospital access,
            evacuation routes, population, and what breaks if a link stays shut.
          </p>
        </div>
      ) : (
        <div className="px-5 py-5 space-y-6">
          <section className="border border-[var(--ink)] bg-[var(--paper-2)] px-4 py-4">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
              {blocked ? `${blocked} blocked corridors` : "Open network"}
              {studied || clerkModel ? (clerkModel ? ` · ${clerkModel}` : " · clerk") : " · desk heuristic"}
            </p>
            <p className="mt-2 text-[20px] font-semibold leading-snug">
              {first
                ? `Repair first: ${first.name} (${first.kind}) — score ${first.score}.`
                : "No ranked links yet."}
            </p>
          </section>

          <section>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Priority</p>
            <h2 className="mt-1 text-[20px] font-semibold">Queue</h2>
            <ol className="mt-3 border border-[var(--ink)] bg-white">
              {ranked.map((row) => (
                <li key={row.id} className="border-b border-[var(--rule)] last:border-0 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      <span className="tabular-nums text-[var(--mute)] font-normal mr-2">
                        {String(row.rank || 0).padStart(2, "0")}
                      </span>
                      {row.name}{" "}
                      <span className="font-normal text-[var(--mute)]">· {row.kind}</span>
                    </span>
                    <span className={row.status === "blocked" ? "text-[var(--crit)] font-semibold" : "text-[var(--mute)]"}>
                      {row.status} · {row.score}
                    </span>
                  </div>
                  {row.reason ? <p className="mt-1 text-[15px] leading-snug">{row.reason}</p> : null}
                  {row.consequences.length ? (
                    <ul className="mt-1 list-disc pl-4 text-[13px] text-[var(--mute)] space-y-0.5">
                      {row.consequences.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
