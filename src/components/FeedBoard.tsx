"use client";

import { useState } from "react";
import { nid } from "@/lib/db";
import { ingestMessage } from "@/lib/pipeline";
import { useOps } from "@/lib/useOps";
import type { VerificationTag } from "@/lib/types";

export function FeedBoard() {
  const { inbox, events, logs } = useOps();
  const rows = inbox.slice(0, 20);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function paste() {
    const rawText = draft.trim();
    if (!rawText) return;
    setBusy(true);
    try {
      await ingestMessage({
        id: nid("IN"),
        rawText,
        source: "Duty paste",
        timestamp: Date.now(),
        processed: false,
      });
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full min-h-0 grid lg:grid-cols-2">
      <section className="min-h-0 overflow-auto border-b lg:border-b-0 lg:border-r border-[var(--ink)]">
        <header className="sticky top-0 bg-white px-5 py-4 border-b border-[var(--ink)]">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Chaotic intake</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-none">Incoming</h1>
          <p className="mt-2 text-[13px] text-[var(--mute)] max-w-[52ch]">
            Needs, offers, and hazards — Hindi, Telugu, or messy English. The clerk structures the line.
          </p>
          <div className="mt-3 flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Paste a WhatsApp line…"
              className="flex-1 p-2 border border-[var(--ink)] text-[14px]"
            />
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => void paste()}
              className="h-10 self-end px-3 bg-[var(--ink)] text-[var(--paper)] text-[13px] disabled:opacity-50"
            >
              {busy ? "Reading…" : "File"}
            </button>
          </div>
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
                {ev && ev.translated && ev.translated !== ev.rawText && (
                  <p className="mt-1 text-[14px] text-[var(--mute)]">{ev.translated}</p>
                )}
                {ev && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[var(--mute)]">
                    <VerifyStamp tag={ev.verification} />
                    <span className="ops-tag">{ev.stage}</span>
                    <span className="ops-tag">{ev.type.replace("_", " ")}</span>
                    <span>
                      {ev.quantity} {ev.resource} · {ev.locationLabel}
                    </span>
                    {ev.language !== "en" && <span>[{ev.language}→en]</span>}
                    {ev.hazardStatus && ev.hazardStatus !== "unknown" && <span>{ev.hazardStatus}</span>}
                  </div>
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

function VerifyStamp({ tag }: { tag: VerificationTag }) {
  const cls =
    tag === "verified" ? "ops-tag ops-tag-verified" : tag === "conflicting" ? "ops-tag ops-tag-conflicting" : "ops-tag ops-tag-uncertain";
  return <span className={cls}>{tag}</span>;
}
