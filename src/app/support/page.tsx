"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ensureSeeded, startLiveFeed } from "@/lib/pipeline";
import { BootScreen } from "@/components/site/BootScreen";
import { useOps } from "@/lib/useOps";
import { claimIncidentHelp, listenApprovedSupport } from "@/lib/support";
import { kmBetween } from "@/lib/geoMath";
import { rankNearestSupport } from "@/lib/nearest";
import { buildCandidates } from "@/lib/dispatch";
import type { ApprovedSupport, Incident } from "@/lib/types";

type Filter = "all" | "routed" | "mine";

export default function SupportPage() {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const { incidents, resources, hazards, sitrep } = useOps();
  const [units, setUnits] = useState<ApprovedSupport[]>([]);
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (ready && (!session || session.role !== "support")) router.replace("/");
  }, [ready, session, router]);

  useEffect(() => {
    if (session?.role === "support") void ensureSeeded().then(() => startLiveFeed());
  }, [session]);

  useEffect(() => listenApprovedSupport(setUnits), []);

  const me = useMemo(
    () => units.find((u) => u.email.toLowerCase() === session?.email.toLowerCase()),
    [units, session],
  );

  const rows = useMemo(() => {
    const open = incidents.filter((i) => i.status !== "resolved");
    const sorted =
      me?.lat == null || me.lng == null ? open : [...open].sort((a, b) => dist(me, a) - dist(me, b));
    if (!session) return sorted;
    if (filter === "routed") {
      return sorted.filter((i) => i.nearest?.some((n) => n.email.toLowerCase() === session.email.toLowerCase()));
    }
    if (filter === "mine") {
      return sorted.filter((i) => i.helper?.email.toLowerCase() === session.email.toLowerCase());
    }
    return sorted;
  }, [incidents, me, filter, session]);

  if (!ready || session?.role !== "support") return <BootScreen label="Opening your field desk" />;

  const org = me?.orgName || me?.name || session.name;
  const kindLabel = me?.kind === "government" ? "Government desk" : "NGO / volunteer desk";
  const helping = incidents.filter((i) => i.helper?.email.toLowerCase() === session.email.toLowerCase()).length;
  const routed = incidents.filter((i) => i.nearest?.some((n) => n.email.toLowerCase() === session.email.toLowerCase())).length;
  const openCount = incidents.filter((i) => i.status !== "resolved").length;
  const blocked = hazards.filter((h) => h.status === "blocked");

  async function help(row: Incident) {
    if (!session) return;
    setErr("");
    setBusyId(row.id);
    try {
      const helper = {
        email: session.email,
        name: session.name,
        orgName: org,
        kind: me?.kind ?? "ngo",
        at: Date.now(),
      };
      const km = me ? dist(me, row) : undefined;
      const candidates = buildCandidates(row, resources, hazards);
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: {
            id: row.id,
            title: row.title,
            locationLabel: row.locationLabel,
            severity: row.severity,
            resource: row.resource,
            nearest: row.nearest,
            helper: row.helper,
            aiPick: row.aiPick,
          },
          helper,
          km,
          candidates,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; allow?: boolean; summary?: string };
      if (!res.ok || data.allow === false) {
        setErr(data.summary || "Clerk held this claim.");
        return;
      }
      const next = await claimIncidentHelp(row, helper, data.summary);
      if (next.helper && next.helper.email.toLowerCase() !== session.email.toLowerCase()) {
        setErr(`${next.helper.orgName} already took this.`);
      }
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="field-shell">
      <aside className="field-rail">
        <Link href="/" className="flex items-center gap-2 px-4 pt-5 pb-4 border-b border-[var(--ink)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" className="h-10 w-10 object-contain" />
          <div>
            <div className="font-semibold leading-none">Aasra</div>
            <div className="mt-1 text-[11px] tracking-[0.16em] uppercase text-[var(--mute)]">{kindLabel}</div>
          </div>
        </Link>
        <div className="ops-rail-sitrep">
          <div className="font-semibold text-[14px]">{org}</div>
          <div className="mt-1 text-[12px] text-[var(--mute)]">{session.email}</div>
          {me?.areaLabel && <div className="mt-1 text-[13px]">{me.areaLabel}</div>}
          <div className="mt-3 ops-rail-grid">
            <div className="ops-rail-cell">
              <span>Open</span>
              <b>{openCount}</b>
            </div>
            <div className="ops-rail-cell">
              <span>Routed</span>
              <b>{routed}</b>
            </div>
            <div className="ops-rail-cell">
              <span>Helping</span>
              <b>{helping}</b>
            </div>
            <div className="ops-rail-cell">
              <span>Roads</span>
              <b className={blocked.length ? "text-[var(--crit)]" : ""}>{blocked.length}</b>
            </div>
          </div>
          {sitrep?.headline && <p className="mt-2 text-[12px] leading-snug text-[var(--mute)]">{sitrep.headline}</p>}
        </div>
        {blocked.length > 0 && (
          <div className="px-4 py-3 border-b border-[var(--rule)] text-[13px]">
            <p className="text-[11px] tracking-[0.16em] uppercase text-[var(--mute)]">Ground</p>
            <ul className="mt-2 space-y-1">
              {blocked.slice(0, 5).map((h) => (
                <li key={h.id}>{h.label}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-auto border-t border-[var(--ink)] px-4 py-3 text-[13px]">
          <p className="text-[11px] tracking-[0.16em] uppercase text-[var(--mute)]">Field desk</p>
          <p className="mt-1 text-[var(--mute)]">Help claims one ticket. The clerk can still hold it.</p>
          <button
            type="button"
            className="mt-3 text-[var(--mute)]"
            onClick={() => {
              void logout().then(() => router.replace("/"));
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="field-main">
        <header className="ops-head bg-[var(--paper)]">
          <p className="ops-kicker">Nearest first</p>
          <h1>Your tickets</h1>
          <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
            Reports closest to your area show first. Press Help to take it. After that, everyone sees who is on it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["all", "All open"],
                ["routed", "Routed to you"],
                ["mine", "You are helping"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`h-9 px-3 border border-[var(--ink)] text-[13px] ${
                  filter === id ? "bg-[var(--ink)] text-white" : "bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {err && <p className="mt-2 text-[var(--crit)]">{err}</p>}
        </header>
        <ul className="p-5 space-y-3">
          {rows.map((i) => {
            const km = me?.lat != null && me.lng != null ? dist(me, i) : undefined;
            const routedToMe = i.nearest?.some((n) => n.email.toLowerCase() === session.email.toLowerCase());
            const taken = Boolean(i.helper);
            const mine = i.helper?.email.toLowerCase() === session.email.toLowerCase();
            const slip =
              i.severity === "critical" ? "field-slip field-slip-crit" : i.severity === "high" ? "field-slip field-slip-high" : "field-slip";
            return (
              <li key={i.id} className={`${slip} px-5 py-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <div className="font-semibold">{i.title}</div>
                      <span className="text-[12px] uppercase tracking-wide text-[var(--mute)]">{i.resource}</span>
                    </div>
                    <div className="mt-1 text-[13px] text-[var(--mute)]">
                      {i.locationLabel}
                      {typeof km === "number" && Number.isFinite(km) ? ` · ${km} km from you` : ""}
                      {routedToMe ? " · routed to you" : ""}
                    </div>
                    {i.reason?.summary && <p className="mt-2 text-[14px] leading-relaxed">{i.reason.summary}</p>}
                    {i.reason?.actions && i.reason.actions.length > 0 && (
                      <p className="mt-2 text-[13px] text-[var(--mute)]">First move: {i.reason.actions[0]}</p>
                    )}
                    {i.aiPick && (
                      <p className="mt-2 text-[13px] text-[var(--mute)]">Desk pick: {i.aiPick.reason}</p>
                    )}
                    {i.nearest && i.nearest.length > 0 && (
                      <p className="mt-2 text-[13px] text-[var(--mute)]">
                        Nearest: {i.nearest.map((n) => `${n.orgName} (${n.km} km)`).join(" · ")}
                      </p>
                    )}
                    {i.helper && (
                      <p className={`mt-2 text-[14px] ${mine ? "text-[var(--ok)]" : "text-[var(--ink)]"}`}>
                        {i.helper.orgName} {mine ? "are helping this now (you)." : "are helping them right now."}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={`text-[12px] uppercase tracking-wide ${
                        i.severity === "critical"
                          ? "text-[var(--crit)]"
                          : i.severity === "high"
                            ? "text-[var(--warn)]"
                            : "text-[var(--mute)]"
                      }`}
                    >
                      {i.severity}
                    </div>
                    <div className="mt-1 tabular-nums text-[13px] text-[var(--mute)]">score {i.priorityScore}</div>
                    {!taken ? (
                      <button
                        type="button"
                        disabled={busyId === i.id}
                        className="mt-2 h-10 px-4 bg-[var(--ink)] text-white disabled:opacity-50"
                        onClick={() => void help(i)}
                      >
                        {busyId === i.id ? "Taking…" : "Help"}
                      </button>
                    ) : (
                      <div className="mt-2 text-[13px] text-[var(--mute)]">Help taken</div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && (
          <p className="px-5 pb-8 text-[var(--mute)]">
            {filter === "mine"
              ? "You are not on a ticket yet. Open All and press Help on the nearest one."
              : filter === "routed"
                ? "Nothing routed to your desk right now. Check All open."
                : "No open tickets yet."}
          </p>
        )}
      </div>
    </div>
  );
}

function dist(me: ApprovedSupport, i: Incident): number {
  if (me.lat == null || me.lng == null) return 9999;
  if (i.lat != null && i.lng != null) return Math.round(kmBetween(me.lat, me.lng, i.lat, i.lng) * 10) / 10;
  const near = rankNearestSupport([me], i.lat ?? 16.5, i.lng ?? 80.64)[0];
  return near?.km ?? 9999;
}
