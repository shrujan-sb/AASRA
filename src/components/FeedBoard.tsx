"use client";

import { useOps } from "@/lib/useOps";

export function FeedBoard() {
  const { inbox, events, logs } = useOps();
  const rows = inbox.slice(0, 16);

  return (
    <div className="h-full min-h-0 grid lg:grid-cols-2">
      <section className="min-h-0 overflow-auto border-b lg:border-b-0 lg:border-r border-[var(--ink)]">
        <header className="sticky top-0 bg-white px-5 py-4 border-b border-[var(--ink)]">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Intake wire</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-none">Incoming</h1>
        </header>
        <ul>
          {rows.map((m) => {
            const ev = events.find((e) => e.id === m.id);
            return (
              <li key={m.id} className="flash-in px-5 py-4 border-b border-[var(--rule)]">
                <div className="flex justify-between gap-3 text-[12px] text-[var(--mute)]">
                  <span>{m.source}</span>
                  <time className="tabular-nums">
                    {new Date(m.timestamp).toLocaleTimeString("en-IN", { hour12: false })}
                  </time>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed">{m.rawText}</p>
                {ev && (
                  <p className="mt-2 text-[13px] text-[var(--mute)]">
                    {ev.verification} · {ev.quantity} {ev.resource} · {ev.locationLabel}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="min-h-0 overflow-auto bg-[var(--paper)]">
        <header className="px-5 py-4 border-b border-[var(--ink)]">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Agents</p>
          <h2 className="mt-1 text-[20px] font-semibold leading-none">What the desk did</h2>
        </header>
        <ul>
          {logs.map((l) => (
            <li key={l.id} className="px-5 py-3 border-b border-[var(--rule)] text-[14px]">
              <div className="text-[11px] uppercase tracking-wide text-[var(--mute)]">
                {l.agent} · {new Date(l.at).toLocaleTimeString("en-IN", { hour12: false })}
              </div>
              <p className="mt-1">{l.message}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
