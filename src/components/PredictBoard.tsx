"use client";

import { useEffect, useMemo, useState } from "react";
import { nid, upsert } from "@/lib/db";
import { wardById } from "@/lib/geo";
import { useOperatorGeo } from "@/lib/operatorGeo";
import { useOps } from "@/lib/useOps";
import type { Assignment, BeforeBrief, ResourceAsset } from "@/lib/types";
import { RiskBoard } from "@/components/RiskBoard";

type LiveRisk = {
  ok?: boolean;
  label?: string;
  headline?: string;
  level?: string;
  rainMm?: number;
  problems?: { title: string; source: string }[];
};

export function PredictBoard() {
  const { resources, incidents, hazards, assignments } = useOps();
  const geo = useOperatorGeo();
  const [brief, setBrief] = useState<BeforeBrief | null>(null);
  const [live, setLive] = useState<LiveRisk | null>(null);
  const [err, setErr] = useState("");
  const [applied, setApplied] = useState(false);

  const open = useMemo(() => incidents.filter((i) => i.status !== "resolved"), [incidents]);
  const incidentKey = useMemo(() => open.map((i) => `${i.id}:${i.severity}:${i.priorityScore}`).join("|"), [open]);

  useEffect(() => {
    const ac = new AbortController();
    void fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resources: resources.map((r) => ({
          id: r.id,
          callsign: r.callsign,
          kind: r.kind,
          status: r.status,
          locationId: r.locationId,
          skills: r.skills,
          equipment: r.equipment,
        })),
        incidents: open.map((i) => ({
          id: i.id,
          title: i.title,
          locationId: i.locationId,
          locationLabel: i.locationLabel,
          severity: i.severity,
          status: i.status,
          resource: i.resource,
          quantity: i.quantity,
        })),
        hazards: hazards.map((h) => ({ id: h.id, label: h.label, status: h.status, roadId: h.roadId })),
      }),
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((data: { brief?: BeforeBrief }) => {
        if (data.brief) {
          setBrief(data.brief);
          setErr("");
        }
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setErr("Predict desk could not refresh.");
      });
    return () => ac.abort();
  }, [incidentKey, resources.length, hazards.length]);

  useEffect(() => {
    if (!geo) return;
    const ac = new AbortController();
    void fetch(`/api/live-risk?lat=${geo.lat}&lng=${geo.lng}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data: LiveRisk) => {
        if (data.ok) setLive(data);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
      });
    return () => ac.abort();
  }, [geo?.lat, geo?.lng]);

  async function applyMoves() {
    if (!brief?.moves.length) return;
    for (const m of brief.moves) {
      const unit = resources.find((r) => r.id === m.resourceId);
      if (!unit || unit.status !== "free") continue;
      const next: ResourceAsset = {
        ...unit,
        locationId: m.toId,
        status: "en_route",
        notes: `Pre-position to ${m.toLabel}`,
      };
      await upsert("resources", unit.id, next);
      const row: Assignment = {
        id: nid("PREP"),
        incidentId: `PREP-${m.toId}`,
        resourceId: unit.id,
        reason: `${m.callsign} → ${m.toLabel}. ${m.why}`,
        etaMin: 18,
        viaRoadIds: [],
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await upsert("assignments", row.id, row);
    }
    setApplied(true);
  }

  const staged = assignments.filter((a) => a.incidentId.startsWith("PREP-") && a.status === "active");

  return (
    <div className="h-full overflow-auto">
      <header className="sticky top-0 z-10 bg-white px-4 sm:px-5 py-4 border-b border-[var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Predict · preplan</p>
            <h1 className="mt-1 text-[24px] sm:text-[26px] font-semibold leading-none">Predict</h1>
          </div>
          {brief?.moves.length ? (
            <button
              type="button"
              disabled={applied}
              onClick={() => void applyMoves()}
              className="h-10 px-4 border border-[var(--ink)] bg-white disabled:opacity-50"
            >
              {applied ? "Moves written" : "Apply preplan"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setErr("");
                void fetch("/api/predict", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    resources,
                    incidents: open,
                    hazards,
                  }),
                })
                  .then((r) => r.json())
                  .then((data: { brief?: BeforeBrief }) => {
                    if (data.brief) setBrief(data.brief);
                    else setErr("Preplan desk had nothing to stage.");
                  })
                  .catch(() => setErr("Preplan desk failed."));
              }}
              className="h-10 px-4 border border-[var(--ink)] bg-white"
            >
              Write preplan
            </button>
          )}
        </div>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      <div className="px-4 sm:px-5 py-5 space-y-6">
        <section className="ops-dossier">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
            {live?.label || (geo ? `${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}` : "Citizen queue")}
            {live?.level ? ` · ${live.level}` : ""}
            {typeof live?.rainMm === "number" ? ` · ${live.rainMm} mm` : ""}
          </p>
          <p className="mt-2 text-[18px] sm:text-[20px] font-semibold leading-snug">
            {live?.headline || brief?.headline || "Reading rain and citizen queue for this pin…"}
          </p>
          {brief?.orders ? <p className="mt-3 text-[15px] leading-relaxed">{brief.orders}</p> : null}
        </section>

        {open.length > 0 ? (
          <section>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Citizen queue driving preplan</p>
            <ul className="mt-2 border border-[var(--ink)] bg-white">
              {open.slice(0, 8).map((i) => (
                <li key={i.id} className="border-b border-[var(--rule)] last:border-0 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`ops-chip ops-chip-${i.severity}`}>{i.severity}</span>
                    {i.channel === "phone" ? <span className="ops-chip ops-chip-normal">phone</span> : null}
                    <span className="font-medium">{i.locationLabel}</span>
                  </div>
                  <p className="mt-1 text-[14px] text-[var(--mute)]">{i.title}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {brief?.moves.length ? (
          <section>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Preplan · stage</p>
            <ul className="mt-2 border border-[var(--ink)]">
              {brief.moves.map((m) => (
                <li key={`${m.resourceId}-${m.toId}`} className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 border-b border-[var(--rule)] last:border-0 px-4 py-3">
                  <span className="font-medium">{m.callsign}</span>
                  <span className="text-[var(--mute)]">
                    {wardById(m.fromId).name} → {m.toLabel}
                  </span>
                  <span className="flex-1 min-w-[16ch] text-[14px]">{m.why}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-[14px] text-[var(--mute)]">Preplan fills once citizen tickets land on the board.</p>
        )}

        {staged.length > 0 ? (
          <p className="text-[14px] text-[var(--mute)]">{staged.length} staging assignment(s) already written.</p>
        ) : null}

        <section id="risk-assessment" className="border-t border-[var(--ink)] pt-6">
          <RiskBoard embedded />
        </section>
      </div>
    </div>
  );
}
