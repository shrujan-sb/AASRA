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
import type { ApprovedSupport, Incident } from "@/lib/types";

export default function SupportPage() {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const { incidents } = useOps();
  const [units, setUnits] = useState<ApprovedSupport[]>([]);
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

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
    if (me?.lat == null || me.lng == null) return open;
    return [...open].sort((a, b) => dist(me, a) - dist(me, b));
  }, [incidents, me]);

  if (!ready || session?.role !== "support") return <BootScreen label="Opening your field desk" />;

  const org = me?.orgName || me?.name || session.name;
  const kindLabel = me?.kind === "government" ? "Government desk" : "NGO / volunteer desk";

  async function help(row: Incident) {
    if (!session) return;
    setErr("");
    setBusyId(row.id);
    try {
      const next = await claimIncidentHelp(row, {
        email: session.email,
        name: session.name,
        orgName: org,
        kind: me?.kind ?? "ngo",
        at: Date.now(),
      });
      if (next.helper && next.helper.email.toLowerCase() !== session.email.toLowerCase()) {
        setErr(`${next.helper.orgName} already took this.`);
      }
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="ops-shell">
      <aside className="ops-rail">
        <Link href="/" className="flex items-center gap-2 px-4 pt-5 pb-4 border-b border-[var(--ink)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" className="h-10 w-10 object-contain" />
          <div>
            <div className="font-semibold leading-none">Aasra</div>
            <div className="mt-1 text-[11px] tracking-[0.16em] uppercase text-[var(--mute)]">{kindLabel}</div>
          </div>
        </Link>
        <div className="px-4 py-3 border-b border-[var(--rule)] text-[13px]">
          <div className="font-semibold">{org}</div>
          <div className="mt-1 text-[var(--mute)]">{session.email}</div>
          {me?.areaLabel && <div className="mt-2">{me.areaLabel}</div>}
        </div>
        <div className="mt-auto border-t border-[var(--ink)] px-4 py-3 text-[13px]">
          <button
            type="button"
            className="text-[var(--mute)]"
            onClick={() => {
              void logout().then(() => router.replace("/"));
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="ops-main overflow-auto">
        <header className="px-5 py-4 border-b border-[var(--ink)]">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Nearest first</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-none">Your tickets</h1>
          <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
            Reports closest to your area show first. Press Help to take it. After that, everyone sees who is on it.
          </p>
          {err && <p className="mt-2 text-[var(--crit)]">{err}</p>}
        </header>
        <ul>
          {rows.map((i) => {
            const km = me?.lat != null && me.lng != null ? dist(me, i) : undefined;
            const routed = i.nearest?.some((n) => n.email.toLowerCase() === session.email.toLowerCase());
            const taken = Boolean(i.helper);
            const mine = i.helper?.email.toLowerCase() === session.email.toLowerCase();
            return (
              <li key={i.id} className="px-5 py-4 border-b border-[var(--rule)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{i.title}</div>
                    <div className="mt-1 text-[13px] text-[var(--mute)]">
                      {i.locationLabel}
                      {typeof km === "number" && Number.isFinite(km) ? ` · ${km} km from you` : ""}
                      {routed ? " · routed to you" : ""}
                    </div>
                    {i.reason?.summary && <p className="mt-2 text-[14px] leading-relaxed">{i.reason.summary}</p>}
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
                    <div className="text-[12px] uppercase tracking-wide text-[var(--mute)]">{i.severity}</div>
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
        {rows.length === 0 && <p className="px-5 py-6 text-[var(--mute)]">No open tickets yet.</p>}
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
