"use client";

import { useEffect, useMemo, useState } from "react";
import { upsert } from "@/lib/db";
import type { Incident } from "@/lib/types";
import { useOps } from "@/lib/useOps";

export function CommandBoard() {
  const { incidents, resources, assignments, events, sitrep } = useOps();
  const open = incidents.filter((i) => i.status !== "resolved");
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const current = useMemo(
    () => incidents.find((i) => i.id === sel) ?? incidents[0] ?? null,
    [incidents, sel],
  );

  useEffect(() => {
    if (!sel && incidents[0]) setSel(incidents[0].id);
  }, [incidents, sel]);

  const event = events.find((e) => e.id === current?.eventId);
  const match = assignments.find((a) => a.incidentId === current?.id && a.status === "active");
  const critical = open.filter((i) => i.severity === "critical").length;
  const high = open.filter((i) => i.severity === "high").length;

  async function restudy(row: Incident) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: row.locationLabel,
          need: event?.rawText || event?.translated || row.title,
          resource: row.resource,
          heuristicSeverity: row.severity,
          heuristicScore: row.priorityScore,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        reason?: Incident["reason"];
        severity?: Incident["severity"];
        priorityScore?: number;
      };
      if (!res.ok || !data.ok || !data.reason) {
        setErr(data.error || "Study failed.");
        return;
      }
      await upsert("incidents", row.id, {
        reason: data.reason,
        severity: data.severity ?? row.severity,
        priorityScore: data.priorityScore ?? row.priorityScore,
        priorityWhy: whyFromStudy(data.reason.decision, data.reason.summary) || row.priorityWhy,
        updatedAt: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full min-h-0 grid grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:grid-rows-none">
      <section className="min-h-0 overflow-auto border-b lg:border-b-0 lg:border-r border-[var(--ink)]">
        <header className="ops-head">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="ops-kicker">Krishna delta · sitrep</p>
              <h1>Needs board</h1>
              {sitrep?.headline ? (
                <p className="mt-2 max-w-[40rem] text-[13px] leading-snug text-[var(--mute)]">{sitrep.headline}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <span className="ops-chip ops-chip-critical">{critical} life</span>
              <span className="ops-chip ops-chip-high">{high} urgent</span>
              <span className="ops-chip ops-chip-normal">
                {open.filter((i) => i.severity === "normal").length} routine
              </span>
              <span className="ops-chip ops-chip-warn">{resources.filter((r) => r.status !== "free").length} out</span>
            </div>
          </div>
        </header>
        <ul>
          {incidents.map((i) => {
            const on = current?.id === i.id;
            const why = whyLine(i);
            return (
              <li key={i.id}>
                <button type="button" onClick={() => setSel(i.id)} className="ops-row" data-on={on ? "true" : "false"}>
                  <span className="tabular-nums font-semibold text-[13px] pt-0.5">
                    {String(i.rank).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium leading-snug">{i.title}</span>
                      <span className={`ops-chip ops-chip-${i.severity}`}>
                        {i.severity === "high" ? "urgent" : i.severity}
                      </span>
                      <span
                        className={
                          i.verification === "verified"
                            ? "ops-tag ops-tag-verified"
                            : i.verification === "conflicting"
                              ? "ops-tag ops-tag-conflicting"
                              : "ops-tag ops-tag-uncertain"
                        }
                      >
                        {i.verification}
                      </span>
                    </span>
                    <p className="mt-0.5 text-[13px] leading-snug">{why}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--mute)]">
                      {i.locationLabel}
                      {i.reason ? " · studied" : ""}
                      {i.helper ? ` · ${i.helper.orgName}` : ""}
                    </p>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block tabular-nums text-[13px] font-semibold">{i.priorityScore}</span>
                    <span className="block text-[10px] uppercase tracking-wide text-[var(--mute)]">{i.status}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {incidents.length === 0 && (
          <p className="px-5 py-6 text-[var(--mute)]">No tickets on the board. Public reports land here after the clerk studies them.</p>
        )}
      </section>

      <aside className="min-h-0 overflow-auto bg-[var(--paper)]">
        {!current ? (
          <p className="p-5 text-[var(--mute)]">No open tickets.</p>
        ) : (
          <div className="p-4 space-y-3">
            <div className="ops-dossier" data-sev={current.severity}>
              <div className="flex justify-between gap-3 items-start">
                <div>
                  <p className="ops-kicker">{current.id}</p>
                  <h2 className="mt-1 text-[18px] font-semibold leading-tight">{current.title}</h2>
                </div>
                <span className={`ops-chip ops-chip-${current.severity}`}>
                  {current.severity === "high" ? "urgent" : current.severity}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--mute)]">Rank</dt>
                  <dd className="tabular-nums">{String(current.rank).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--mute)]">Score</dt>
                  <dd className="tabular-nums">{current.priorityScore}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--mute)]">Place</dt>
                  <dd>{current.locationLabel}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--mute)]">Need</dt>
                  <dd>
                    {current.quantity} {current.resource}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--mute)]">Status</dt>
                  <dd className="capitalize">{current.status}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--mute)]">Check</dt>
                  <dd>
                    <span
                      className={
                        current.verification === "verified"
                          ? "ops-tag ops-tag-verified"
                          : current.verification === "conflicting"
                            ? "ops-tag ops-tag-conflicting"
                            : "ops-tag ops-tag-uncertain"
                      }
                    >
                      {current.verification}
                    </span>
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--mute)]">Why</dt>
                  <dd>{whyLine(current)}</dd>
                </div>
              </dl>
              {event && (
                <p className="mt-3 text-[13px] leading-relaxed border-t border-[var(--rule)] pt-2">{event.rawText}</p>
              )}
              {match && <p className="mt-2 text-[13px]">{match.reason}</p>}
              {current.aiPick && (
                <p className="mt-2 text-[13px] font-medium">
                  Clerk pick: {current.aiPick.reason}
                  {current.aiPick.model ? ` · ${current.aiPick.model}` : ""}
                </p>
              )}
              {current.claimNote && (
                <p className="mt-2 text-[12px] text-[var(--mute)]">Help claim: {current.claimNote}</p>
              )}
              {current.helper && (
                <p className="mt-2 text-[14px] font-medium">{current.helper.orgName} are helping them right now.</p>
              )}
              {current.nearest && current.nearest.length > 0 && (
                <p className="mt-2 text-[12px] text-[var(--mute)]">
                  Nearest desks: {current.nearest.map((n) => `${n.orgName} (${n.km} km)`).join(" · ")}
                </p>
              )}
            </div>

            <div className="ops-dossier" data-sev={current.reason ? current.severity : undefined}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[14px] font-semibold">Clerk study</h3>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void restudy(current)}
                  className="h-8 px-3 text-[12px] border border-[var(--ink)] bg-white disabled:opacity-50"
                >
                  {busy ? "Reading…" : current.reason ? "Restudy" : "Study now"}
                </button>
              </div>
              {err && <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p>}
              {current.reason ? (
                <>
                  {current.reason.decision && (
                    <p className="mt-2 text-[14px] font-semibold">{current.reason.decision}</p>
                  )}
                  <p className="mt-2 text-[14px] leading-relaxed">{current.reason.summary}</p>
                  {current.reason.risks.length > 0 && (
                    <div className="mt-2">
                      <p className="ops-kicker">Risks</p>
                      <ul className="mt-1 list-disc pl-4 text-[13px] space-y-0.5">
                        {current.reason.risks.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {current.reason.actions.length > 0 && (
                    <div className="mt-2">
                      <p className="ops-kicker">First moves</p>
                      <ol className="mt-1 list-decimal pl-4 text-[13px] space-y-0.5">
                        {current.reason.actions.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-[var(--mute)]">
                    {typeof current.reason.peopleEstimate === "number" ? `~${current.reason.peopleEstimate} people · ` : ""}
                    {typeof current.reason.confidence === "number"
                      ? `${Math.round(current.reason.confidence * 100)}% confidence · `
                      : ""}
                    {current.reason.model}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-[var(--mute)]">
                  New tickets are studied on intake. Seed rows can be studied here.
                </p>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function whyFromStudy(decision?: string, summary?: string): string {
  const decisionLine = oneLine(decision);
  if (decisionLine) return decisionLine;
  return oneLine(summary);
}

function whyLine(i: Incident): string {
  const stored = oneLine(i.priorityWhy);
  if (stored) return stored;
  const studied = whyFromStudy(i.reason?.decision, i.reason?.summary);
  if (studied) return studied;
  const check =
    i.verification === "verified"
      ? "source holds"
      : i.verification === "uncertain"
        ? "source still uncertain"
        : "sources conflict";
  return `${i.severity} · score ${i.priorityScore} · ${i.resource} · ${check}`;
}

function oneLine(s?: string): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  const first = t.split(/(?<=[.!?])\s/)[0] ?? t;
  return first.length > 140 ? `${first.slice(0, 137).trimEnd()}…` : first;
}
