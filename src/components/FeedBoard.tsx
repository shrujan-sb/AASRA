"use client";

import { useEffect, useState } from "react";
import { useOps } from "@/lib/useOps";
import type { VerificationTag } from "@/lib/types";

export function FeedBoard() {
  const { inbox, events, logs } = useOps();
  const rows = inbox.slice(0, 24);
  const [sel, setSel] = useState<string | null>(null);
  const current = rows.find((m) => m.id === sel) ?? rows[0];
  const ev = events.find((e) => e.id === current?.id);

  useEffect(() => {
    if (!sel && rows[0]) setSel(rows[0].id);
  }, [rows, sel]);

  return (
    <div className="h-full min-h-0 grid lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.85fr)_minmax(240px,0.7fr)]">
      <section className="min-h-0 overflow-auto border-b lg:border-b-0 lg:border-r border-[var(--ink)]">
        <header className="ops-head">
          <p className="ops-kicker">Intake wire</p>
          <h1>Incoming</h1>
        </header>
        <ul>
          {rows.map((m) => {
            const rowEv = events.find((e) => e.id === m.id);
            const on = current?.id === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSel(m.id)}
                  className={`flash-in w-full text-left px-4 py-2.5 border-b border-[var(--rule)] ${
                    on ? "bg-[var(--paper-2)]" : "bg-white hover:bg-[var(--paper)]"
                  }`}
                >
                  <div className="flex justify-between gap-3 text-[11px] text-[var(--mute)]">
                    <span>{m.source}</span>
                    <time className="tabular-nums">
                      {new Date(m.timestamp).toLocaleTimeString("en-IN", { hour12: false })}
                    </time>
                  </div>
                  <p className="mt-1 text-[14px] leading-snug">{m.rawText}</p>
                  {rowEv && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <VerifyStamp tag={rowEv.verification} />
                      <span className="ops-tag">{rowEv.stage}</span>
                      {rowEv.hazardStatus && rowEv.hazardStatus !== "unknown" && (
                        <span className="ops-chip ops-chip-critical">{rowEv.hazardStatus}</span>
                      )}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="min-h-0 overflow-auto bg-[var(--paper)] border-b lg:border-b-0 lg:border-r border-[var(--ink)]">
        <header className="ops-head bg-[var(--paper)]">
          <p className="ops-kicker">Chit</p>
          <h1 className="text-[18px]">Dossier</h1>
        </header>
        {!current ? (
          <p className="p-4 text-[var(--mute)]">Wire is quiet.</p>
        ) : (
          <div className="p-4">
            <div className="ops-dossier" data-sev={ev?.hazardStatus === "blocked" ? "critical" : undefined}>
              <div className="flex justify-between gap-2 text-[11px] text-[var(--mute)]">
                <span>{current.source}</span>
                <time className="tabular-nums">
                  {new Date(current.timestamp).toLocaleTimeString("en-IN", { hour12: false })}
                </time>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed">{current.rawText}</p>
              {ev && (
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
                  <div>
                    <dt className="ops-kicker">Stage</dt>
                    <dd>{ev.stage}</dd>
                  </div>
                  <div>
                    <dt className="ops-kicker">Type</dt>
                    <dd>{ev.type.replace("_", " ")}</dd>
                  </div>
                  <div>
                    <dt className="ops-kicker">Place</dt>
                    <dd>{ev.locationLabel}</dd>
                  </div>
                  <div>
                    <dt className="ops-kicker">Need</dt>
                    <dd>
                      {ev.quantity} {ev.resource}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="ops-kicker">Check</dt>
                    <dd>
                      <VerifyStamp tag={ev.verification} />
                      {ev.language !== "en" ? <span className="ml-2 text-[var(--mute)]">[{ev.language}→en]</span> : null}
                    </dd>
                  </div>
                  {ev.translated && ev.translated !== ev.rawText && (
                    <div className="col-span-2">
                      <dt className="ops-kicker">English</dt>
                      <dd>{ev.translated}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="min-h-0 overflow-auto">
        <header className="ops-head">
          <p className="ops-kicker">Agents</p>
          <h1 className="text-[18px]">What the desk did</h1>
        </header>
        <ul>
          {logs.map((l) => (
            <li key={l.id} className="px-4 py-2 border-b border-[var(--rule)] text-[13px]">
              <div className="flex justify-between gap-2 text-[10px] uppercase tracking-wide text-[var(--mute)]">
                <span>{l.agent}</span>
                <time className="tabular-nums">{new Date(l.at).toLocaleTimeString("en-IN", { hour12: false })}</time>
              </div>
              <p className="mt-0.5 leading-snug">{l.message}</p>
            </li>
          ))}
        </ul>
        {logs.length === 0 && (
          <p className="px-5 py-6 text-[var(--mute)]">No clerk or routing lines yet.</p>
        )}
      </section>
    </div>
  );
}

function VerifyStamp({ tag }: { tag: VerificationTag }) {
  const cls =
    tag === "verified" ? "ops-tag ops-tag-verified" : tag === "conflicting" ? "ops-tag ops-tag-conflicting" : "ops-tag ops-tag-uncertain";
  return <span className={cls}>{tag}</span>;
}
