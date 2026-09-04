"use client";

import { useEffect, useMemo, useState } from "react";
import { upsert } from "@/lib/db";
import type { Incident } from "@/lib/types";
import { useOps } from "@/lib/useOps";

export function CommandBoard() {
  const { incidents, resources, assignments, events } = useOps();
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
        updatedAt: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full min-h-0 grid grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:grid-rows-none">
      <section className="min-h-0 overflow-auto border-b lg:border-b-0 lg:border-r border-[var(--ink)]">
        <header className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-[var(--ink)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Krishna delta · ranked</p>
              <h1 className="mt-1 text-[26px] font-semibold leading-none">Needs board</h1>
            </div>
            <div className="flex gap-5 text-[13px]">
              <Metric n={critical} label="life" alert={critical > 0} />
              <Metric n={high} label="urgent" />
              <Metric n={open.filter((i) => i.severity === "normal").length} label="routine" />
              <Metric n={resources.filter((r) => r.status !== "free").length} label="out" />
            </div>
          </div>
        </header>
        <ul>
          {incidents.map((i) => {
            const on = current?.id === i.id;
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setSel(i.id)}
                  className={`w-full text-left px-5 py-3.5 border-b border-[var(--rule)] flex gap-4 items-start ${
                    on ? "bg-[var(--paper)]" : "bg-white hover:bg-[var(--paper-2)]"
                  }`}
                >
                  <span className="w-8 pt-0.5 tabular-nums text-[var(--mute)]">{String(i.rank).padStart(2, "0")}</span>
                  <span className={`mt-1 h-3 w-3 shrink-0 ${sevDot(i.severity)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium leading-snug">{i.title}</div>
                    <div className="mt-1 text-[13px] text-[var(--mute)]">
                      {i.locationLabel} · {i.verification}
                      {i.reason ? " · studied" : ""}
                      {i.helper ? ` · ${i.helper.orgName}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[13px] font-semibold uppercase tracking-wide ${sevColor(i.severity)}`}>
                      {i.severity}
                    </div>
                    <div className="tabular-nums text-[13px] text-[var(--mute)]">{i.priorityScore}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="min-h-0 overflow-auto bg-[var(--paper)]">
        {!current ? (
          <p className="p-6 text-[var(--mute)]">No open tickets.</p>
        ) : (
          <div className="p-5">
            <div className="ops-dossier">
              <div className="flex justify-between gap-3 items-start">
                <div>
                  <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">{current.id}</p>
                  <h2 className="mt-1 text-[20px] font-semibold leading-tight">{current.title}</h2>
                </div>
                <span className={`text-[12px] font-semibold uppercase tracking-wide ${sevColor(current.severity)}`}>
                  {current.severity}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <div>
                  <dt className="text-[var(--mute)]">Place</dt>
                  <dd>{current.locationLabel}</dd>
                </div>
                <div>
                  <dt className="text-[var(--mute)]">Status</dt>
                  <dd className="capitalize">{current.status}</dd>
                </div>
                <div>
                  <dt className="text-[var(--mute)]">Score</dt>
                  <dd className="tabular-nums">{current.priorityScore}</dd>
                </div>
                <div>
                  <dt className="text-[var(--mute)]">Check</dt>
                  <dd>{current.verification}</dd>
                </div>
              </dl>
              {event && (
                <p className="mt-4 text-[14px] leading-relaxed border-t border-[var(--rule)] pt-3">{event.rawText}</p>
              )}
              {match && (
                <p className="mt-3 text-[13px] text-[var(--mute)]">Match: {match.reason}</p>
              )}
              {current.helper && (
                <p className="mt-3 text-[15px] font-medium">
                  {current.helper.orgName} are helping them right now.
                </p>
              )}
              {current.nearest && current.nearest.length > 0 && (
                <p className="mt-2 text-[13px] text-[var(--mute)]">
                  Nearest desks: {current.nearest.map((n) => `${n.orgName} (${n.km} km)`).join(" · ")}
                </p>
              )}
            </div>

            <div className="mt-4 ops-dossier">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-semibold">Clerk study</h3>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void restudy(current)}
                  className="h-8 px-3 text-[13px] border border-[var(--ink)] bg-white disabled:opacity-50"
                >
                  {busy ? "Reading…" : current.reason ? "Restudy" : "Study now"}
                </button>
              </div>
              {err && <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p>}
              {current.reason ? (
                <>
                  {current.reason.decision && (
                    <p className="mt-3 text-[15px] font-semibold">{current.reason.decision}</p>
                  )}
                  <p className="mt-3 text-[15px] leading-relaxed">{current.reason.summary}</p>
                  {current.reason.risks.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] tracking-[0.16em] uppercase text-[var(--mute)]">Risks</p>
                      <ul className="mt-1 list-disc pl-4 text-[14px] space-y-1">
                        {current.reason.risks.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {current.reason.actions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] tracking-[0.16em] uppercase text-[var(--mute)]">First moves</p>
                      <ol className="mt-1 list-decimal pl-4 text-[14px] space-y-1">
                        {current.reason.actions.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <p className="mt-3 text-[12px] text-[var(--mute)]">
                    {typeof current.reason.peopleEstimate === "number" ? `~${current.reason.peopleEstimate} people · ` : ""}
                    {typeof current.reason.confidence === "number"
                      ? `${Math.round(current.reason.confidence * 100)}% confidence · `
                      : ""}
                    {current.reason.model}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-[14px] text-[var(--mute)]">
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

function Metric({ n, label, alert }: { n: number; label: string; alert?: boolean }) {
  return (
    <div className="text-right">
      <div className={`text-[22px] font-semibold tabular-nums leading-none ${alert ? "text-[var(--crit)]" : ""}`}>{n}</div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--mute)]">{label}</div>
    </div>
  );
}

function sevColor(s: Incident["severity"]) {
  if (s === "critical") return "text-[var(--crit)]";
  if (s === "high") return "text-[var(--warn)]";
  return "text-[var(--mute)]";
}

function sevDot(s: Incident["severity"]) {
  if (s === "critical") return "bg-[var(--crit)]";
  if (s === "high") return "bg-[var(--warn)]";
  return "bg-[var(--rule)]";
}
