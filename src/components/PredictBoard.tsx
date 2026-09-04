"use client";

import { useEffect, useState } from "react";
import { nid, upsert } from "@/lib/db";
import { wardById } from "@/lib/geo";
import { useOperatorGeo } from "@/lib/operatorGeo";
import type { Assignment, BeforeBrief, ResourceAsset } from "@/lib/types";
import { useOps } from "@/lib/useOps";
import { RiskBoard } from "@/components/RiskBoard";

type LiveRisk = {
  ok?: boolean;
  label?: string;
  headline?: string;
  level?: string;
  problems?: { title: string; source: string }[];
};

export function PredictBoard() {
  const { resources, incidents, hazards, assignments } = useOps();
  const geo = useOperatorGeo();
  const [brief, setBrief] = useState<BeforeBrief | null>(null);
  const [live, setLive] = useState<LiveRisk | null>(null);
  const [err, setErr] = useState("");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    void fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resources: resources.map((r) => ({ id: r.id, callsign: r.callsign, kind: r.kind, status: r.status, locationId: r.locationId, skills: r.skills, equipment: r.equipment })),
        incidents: incidents.filter((i) => i.status !== "resolved").map((i) => ({ id: i.id, title: i.title, locationId: i.locationId, severity: i.severity, status: i.status })),
        hazards: hazards.map((h) => ({ id: h.id, label: h.label, status: h.status, roadId: h.roadId })),
      }),
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((data: { brief?: BeforeBrief }) => {
        if (data.brief) setBrief(data.brief);
      })
      .catch(() => setErr("Predict failed."));
    return () => ac.abort();
  }, [incidents.length, resources.length, hazards.length]);

  useEffect(() => {
    if (!geo) return;
    const ac = new AbortController();
    void fetch(`/api/live-risk?lat=${geo.lat}&lng=${geo.lng}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data: LiveRisk) => {
        if (data.ok) setLive(data);
      })
      .catch(() => undefined);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#risk-assessment") return;
    document.getElementById("risk-assessment")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [brief, live]);

  return (
    <div className="h-full overflow-auto">
      <header className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-[var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Live · your pin</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-none">Predict</h1>
          </div>
          {brief?.moves.length ? (
            <button
              type="button"
              disabled={applied}
              onClick={() => void applyMoves()}
              className="h-10 px-4 border border-[var(--ink)] bg-white disabled:opacity-50"
            >
              {applied ? "Moves written" : "Apply staging"}
            </button>
          ) : null}
        </div>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      <div className="px-5 py-5 space-y-6">
        <section className="ops-dossier">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
            {live?.label || (geo ? `${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}` : "Waiting for GPS")}
            {live?.level ? ` · ${live.level}` : ""}
          </p>
          <p className="mt-2 text-[20px] font-semibold leading-snug">
            {live?.headline || brief?.headline || "Reading rain and web alerts for this device…"}
          </p>
          {brief?.orders ? <p className="mt-3 text-[15px] leading-relaxed">{brief.orders}</p> : null}
        </section>

        {live?.problems && live.problems.length > 0 ? (
          <section>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Live problems</p>
            <ul className="mt-2 border border-[var(--ink)]">
              {live.problems.map((p, i) => (
                <li key={`${p.title}-${i}`} className="border-b border-[var(--rule)] last:border-0 px-4 py-3">
                  <p className="font-medium leading-snug">{p.title}</p>
                  <p className="mt-1 text-[12px] text-[var(--mute)]">{p.source}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {brief?.moves.length ? (
          <section>
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Stage</p>
            <ul className="mt-2 border border-[var(--ink)]">
              {brief.moves.map((m) => (
                <li key={`${m.resourceId}-${m.toId}`} className="flex flex-wrap gap-3 border-b border-[var(--rule)] last:border-0 px-4 py-3">
                  <span className="w-36 font-medium">{m.callsign}</span>
                  <span className="text-[var(--mute)]">
                    {wardById(m.fromId).name} → {m.toLabel}
                  </span>
                  <span className="flex-1 min-w-[16ch]">{m.why}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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
