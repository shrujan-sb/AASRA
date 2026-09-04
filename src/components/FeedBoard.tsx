"use client";

import { useOps } from "@/lib/useOps";

export function FeedBoard() {
  const { inbox, events } = useOps();
  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
      <section className="border border-[var(--line)] bg-[var(--panel)] overflow-auto">
        <h2 className="display sticky top-0 bg-[var(--panel)] px-2 py-1 text-[11px] tracking-[0.18em] border-b border-[var(--line)]">
          RAW INTAKE
        </h2>
        {inbox.map((m) => (
          <article key={m.id} className="px-2 py-2 border-b border-[var(--line)] flash-in">
            <div className="text-[10px] text-[var(--muted)]">
              {new Date(m.timestamp).toLocaleTimeString()} · {m.source}
            </div>
            <div className="text-[12px] mt-1">{m.rawText}</div>
          </article>
        ))}
      </section>
      <section className="border border-[var(--line)] bg-[var(--panel)] overflow-auto">
        <h2 className="display sticky top-0 bg-[var(--panel)] px-2 py-1 text-[11px] tracking-[0.18em] border-b border-[var(--line)]">
          STRUCTURED / VERIFIED
        </h2>
        {events.map((e) => (
          <article key={e.id} className="px-2 py-2 border-b border-[var(--line)] flash-in text-[11px]">
            <div className="flex gap-2 flex-wrap">
              <span className="text-[var(--info)]">{e.type}</span>
              <span className={`tag-${e.verification}`}>{e.verification}</span>
              <span className="text-[var(--muted)]">{e.stage}</span>
              <span>{e.locationId}</span>
              <span>
                {e.quantity} {e.resource}
              </span>
            </div>
            <div className="text-[var(--muted)] mt-1">{e.translated}</div>
            <div className="text-[10px] text-[var(--muted)]">
              src {e.source} · rel {e.sourceReliability} · n={e.corroboration}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
