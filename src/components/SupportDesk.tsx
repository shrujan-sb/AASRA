"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ensureSeeded, startLiveFeed } from "@/lib/pipeline";
import { BootScreen } from "@/components/site/BootScreen";
import { useOps } from "@/lib/useOps";
import { claimIncidentHelp, listenApprovedSupport } from "@/lib/support";
import { isRecommendedFor, kmToIncident, rankNearestSupport } from "@/lib/nearest";
import { parseSupportKind, supportDeskPath, supportDeskTitle } from "@/lib/supportKind";
import type { ApprovedSupport, Incident, SupportKind } from "@/lib/types";

type Filter = "recommended" | "all" | "mine";

export function SupportDesk({ kind }: { kind: SupportKind }) {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const { incidents, sitrep } = useOps();
  const [units, setUnits] = useState<ApprovedSupport[]>([]);
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<Filter>("recommended");

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

  useEffect(() => {
    const actual = me?.kind ? parseSupportKind(me.kind) : session?.supportKind;
    if (actual && actual !== kind) router.replace(supportDeskPath(actual));
  }, [me, session, kind, router]);

  const located = useMemo(() => {
    return incidents.map((i) => {
      if (i.lat == null || i.lng == null || !units.length) return i;
      return { ...i, nearest: rankNearestSupport(units, i.lat, i.lng) };
    });
  }, [incidents, units]);

  const rows = useMemo(() => {
    const open = located.filter((i) => i.status !== "resolved");
    const email = session?.email ?? "";
    const sorted =
      me?.lat == null || me.lng == null ? open : [...open].sort((a, b) => kmToIncident(me, a) - kmToIncident(me, b));
    if (!session) return sorted;
    if (filter === "recommended") {
      return sorted.filter((i) => !i.helper && isRecommendedFor(i, email, kind));
    }
    if (filter === "mine") {
      return sorted.filter((i) => i.helper?.email.toLowerCase() === email.toLowerCase());
    }
    return sorted;
  }, [located, me, filter, session, kind]);

  if (!ready || session?.role !== "support") return <BootScreen label={`Opening the ${supportDeskTitle(kind)}`} />;

  const org = me?.orgName || me?.name || session.name;
  const helping = located.filter((i) => i.helper?.email.toLowerCase() === session.email.toLowerCase()).length;
  const recommended = located.filter(
    (i) => i.status !== "resolved" && !i.helper && isRecommendedFor(i, session.email, kind),
  ).length;
  const openCount = located.filter((i) => i.status !== "resolved").length;

  async function takeInitiative(row: Incident) {
    if (!session) return;
    if (row.helper) return;
    setErr("");
    setBusyId(row.id);
    const helper = {
      email: session.email,
      name: session.name,
      orgName: org,
      kind,
      at: Date.now(),
    };
    try {
      const next = await claimIncidentHelp(row, helper, `${session.name} took the initiative.`);
      if (next.helper && next.helper.email.toLowerCase() !== session.email.toLowerCase()) {
        setErr(`${next.helper.name} took the initiative.`);
        return;
      }
      void fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: { id: row.id, helper: row.helper },
          helper,
        }),
      }).then(async (res) => {
        const data = (await res.json()) as { ok?: boolean; allow?: boolean; summary?: string };
        if (!res.ok || data.allow === false) setErr(data.summary || "Could not take this ticket.");
      });
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
            <div className="mt-1 text-[11px] tracking-[0.16em] uppercase text-[var(--mute)]">{supportDeskTitle(kind)}</div>
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
              <span>For you</span>
              <b>{recommended}</b>
            </div>
            <div className="ops-rail-cell">
              <span>Taken</span>
              <b>{helping}</b>
            </div>
            <div className="ops-rail-cell">
              <span>Roads</span>
              <b className={sitrep?.roadsBlocked ? "text-[var(--crit)]" : ""}>{sitrep?.roadsBlocked ?? 0}</b>
            </div>
          </div>
          {sitrep?.headline && <p className="mt-2 text-[12px] leading-snug text-[var(--mute)]">{sitrep.headline}</p>}
        </div>
        <div className="mt-auto border-t border-[var(--ink)] px-4 py-3 text-[13px]">
          <p className="text-[11px] tracking-[0.16em] uppercase text-[var(--mute)]">Field desk</p>
          <p className="mt-1 text-[var(--mute)]">One person takes initiative. Then everyone sees their name.</p>
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
          <p className="ops-kicker">{supportDeskTitle(kind)}</p>
          <h1>Your tickets</h1>
          <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
            Reports nearest to your posting show as recommended. Take initiative once — the button leaves every desk.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["recommended", "Recommended for you"],
                ["all", "All open"],
                ["mine", "You took initiative"],
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
            const km = me ? kmToIncident(me, i) : undefined;
            const recommendedForMe = isRecommendedFor(i, session.email, kind);
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
                      {recommendedForMe && !taken && (
                        <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--ok)]">Recommended for you</span>
                      )}
                    </div>
                    <div className="mt-1 text-[13px] text-[var(--mute)]">
                      {i.locationLabel}
                      {typeof km === "number" && Number.isFinite(km) && km < 9000 ? ` · ${km} km from your area` : ""}
                      {i.phone ? ` · ${i.phone}` : ""}
                      {i.channel === "phone" ? " · phone desk" : ""}
                    </div>
                    {i.reason?.summary && <p className="mt-2 text-[14px] leading-relaxed">{i.reason.summary}</p>}
                    {i.nearest && i.nearest.length > 0 && (
                      <p className="mt-2 text-[13px] text-[var(--mute)]">
                        Nearest teams: {i.nearest.slice(0, 3).map((n) => `${n.orgName} (${n.km} km)`).join(" · ")}
                      </p>
                    )}
                    {i.helper && (
                      <p className={`mt-2 text-[14px] ${mine ? "text-[var(--ok)]" : "text-[var(--ink)]"}`}>
                        {i.helper.name} took the initiative
                        {i.helper.orgName ? ` · ${i.helper.orgName}` : ""}.
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
                        onClick={() => void takeInitiative(i)}
                      >
                        {busyId === i.id ? "Taking…" : "Take initiative"}
                      </button>
                    ) : (
                      <div className="mt-2 max-w-[16ch] text-[13px] text-[var(--mute)]">
                        {i.helper?.name} took the initiative
                      </div>
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
              ? "You have not taken initiative yet. Open All open or Recommended."
              : filter === "recommended"
                ? "No report is nearest to your posting right now. Check All open."
                : "No open tickets yet."}
          </p>
        )}
      </div>
    </div>
  );
}
