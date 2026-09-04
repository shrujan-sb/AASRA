"use client";

import { useMemo, useState } from "react";
import { clerkAsk, heuristicVerify } from "@/lib/agents/verification";
import { upsert } from "@/lib/db";
import { requestVerify } from "@/lib/opsRemote";
import type { Hazard, Incident, StructuredEvent, VerificationTag } from "@/lib/types";
import { useOps } from "@/lib/useOps";

export function VerifyBoard() {
  const { events, incidents, hazards } = useOps();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, StructuredEvent[]>();
    for (const e of events) {
      const list = map.get(e.subjectKey) ?? [];
      list.push(e);
      map.set(e.subjectKey, list);
    }
    return [...map.entries()]
      .map(([key, rows]) => ({
        key,
        rows: [...rows].sort((a, b) => b.timestamp - a.timestamp),
      }))
      .filter((g) => g.rows.length > 1 || g.rows.some((r) => r.verification === "conflicting"))
      .sort((a, b) => {
        const ac = a.rows.some((r) => r.verification === "conflicting") ? 0 : 1;
        const bc = b.rows.some((r) => r.verification === "conflicting") ? 0 : 1;
        return ac - bc;
      });
  }, [events]);

  async function runGroup(subjectKey: string) {
    const corpus = events;
    const incoming = corpus.filter((e) => e.subjectKey === subjectKey).sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!incoming) return;
    setBusy(true);
    setErr("");
    setNote("");
    try {
      const heuristic = heuristicVerify({ incoming, corpus });
      const ask = clerkAsk({ incoming, corpus }, heuristic);
      const hit = await requestVerify(ask);
      if (!hit.ok) {
        setErr("Verify desk failed.");
        return;
      }
      const tag = hit.verification;
      for (const id of hit.ids) {
        const row = corpus.find((e) => e.id === id);
        if (row) await upsert("events", id, { ...row, verification: tag });
      }
      for (const inc of incidents) {
        if (hit.ids.includes(inc.eventId) || inc.id === `INC-${subjectKey}`) {
          await upsert("incidents", inc.id, { ...inc, verification: tag, updatedAt: Date.now() } as Incident);
        }
      }
      for (const hz of hazards) {
        if (hz.sourceEventId && hit.ids.includes(hz.sourceEventId)) {
          await upsert("hazards", hz.id, { ...hz, verification: tag, updatedAt: Date.now() } as Hazard);
        }
      }
      setNote(`${hit.studied ? "Clerk" : "Heuristic"}: ${tag}${hit.reason ? ` — ${hit.reason}` : ""}`);
    } catch {
      setErr("Verify desk failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Blocked vs open</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-none">Conflict</h1>
        <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
          The clerk compares contemporaneous reports on the same subject. Classic conflict: one source says a road is
          blocked, another says it is open.
        </p>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
        {note ? <p className="mt-2 text-[13px]">{note}</p> : null}
      </header>

      {!groups.length ? (
        <p className="px-5 py-8 text-[15px] text-[var(--mute)]">No overlapping reports yet. Wait for the wire, or inject a corridor block.</p>
      ) : (
        <ul className="px-5 py-5 space-y-5">
          {groups.map((g) => {
            const conflict = g.rows.some((r) => r.verification === "conflicting");
            return (
              <li key={g.key} className="border border-[var(--ink)] bg-white">
                <div className="px-4 py-3 border-b border-[var(--rule)] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[var(--mute)]">{g.key}</p>
                    <p className="font-semibold">{g.rows[0]?.locationLabel}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runGroup(g.key)}
                    className="h-8 px-3 text-[13px] border border-[var(--ink)] bg-[var(--paper)] disabled:opacity-50"
                  >
                    {busy ? "Checking…" : "Ask clerk"}
                  </button>
                </div>
                {g.rows.map((r) => (
                  <div key={r.id} className="px-4 py-3 border-b border-[var(--rule)] last:border-0">
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--mute)]">
                      <VerifyStamp tag={r.verification} />
                      {conflict ? <span className="text-[var(--crit)]">conflict</span> : null}
                      <span>{r.source}</span>
                      <time className="tabular-nums">
                        {new Date(r.timestamp).toLocaleTimeString("en-IN", { hour12: false })}
                      </time>
                      {r.hazardStatus && r.hazardStatus !== "unknown" ? <span>{r.hazardStatus}</span> : null}
                    </div>
                    <p className="mt-1 text-[15px]">{r.translated || r.rawText}</p>
                    {r.translated && r.translated !== r.rawText ? (
                      <p className="mt-1 text-[13px] text-[var(--mute)]">{r.rawText}</p>
                    ) : null}
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function VerifyStamp({ tag }: { tag: VerificationTag }) {
  const cls =
    tag === "verified"
      ? "ops-tag ops-tag-verified"
      : tag === "conflicting"
        ? "ops-tag ops-tag-conflicting"
        : "ops-tag ops-tag-uncertain";
  return <span className={cls}>{tag}</span>;
}
