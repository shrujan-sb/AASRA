"use client";

import { useOps } from "@/lib/useOps";

const STAGES = ["received", "structured", "verified", "prioritized", "assigned"] as const;

export function FeedBoard() {
  const { inbox, events } = useOps();
  return (
    <div className="h-full overflow-auto px-6 md:px-10 py-8 grid md:grid-cols-2 gap-12">
      <section>
        <h2 className="text-4xl font-semibold">
          Raw <span className="mark text-6xl text-[var(--crit)]">intake</span>
        </h2>
        <ul className="mt-6 divide-y-2 divide-[var(--rule)]">
          {inbox.map((m) => (
            <li key={m.id} className="py-5 flash-in">
              <div className="text-base text-[var(--mute)]">
                {new Date(m.timestamp).toLocaleTimeString()} · {m.source}
              </div>
              <p className="mt-2 text-2xl leading-snug">{m.rawText}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-4xl font-semibold">
          Made <span className="mark text-6xl">structured</span>
        </h2>
        <ul className="mt-6 divide-y-2 divide-[var(--rule)]">
          {events.map((e) => (
            <li key={e.id} className="py-5 flash-in">
              <div className="flex flex-wrap items-baseline gap-3 text-lg">
                <span className="font-semibold">{e.type}</span>
                <span className={`mark text-3xl ${e.verification === "conflicting" ? "text-[var(--crit)]" : e.verification === "verified" ? "text-[var(--ok)]" : "text-[var(--warn)]"}`}>
                  {e.verification}
                </span>
                <span>
                  {e.quantity} {e.resource} · {e.locationId}
                </span>
              </div>
              <p className="mt-2 text-xl leading-snug">{e.translated}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-base">
                {STAGES.map((s, idx) => {
                  const current =
                    e.stage === "assigned" ? 4 : e.stage === "prioritized" ? 3 : 2;
                  const on = idx <= current;
                  return (
                    <span
                      key={s}
                      className={`px-3 py-1 border-2 border-[var(--rule)] ${on ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--mute)]"}`}
                    >
                      {s}
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
