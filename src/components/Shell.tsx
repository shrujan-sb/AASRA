"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BootScreen } from "@/components/site/BootScreen";
import { useAuth } from "@/lib/auth";
import { ensureSeeded, resetSession, startLiveFeed } from "@/lib/pipeline";
import { useLang } from "@/lib/i18n";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useOps } from "@/lib/useOps";

const NAV: { href: string; label: string; hint: string; group: string }[] = [
  { href: "/console", label: "Needs", hint: "Ranked tickets", group: "Watch" },
  { href: "/console/priority", label: "Rank", hint: "Life-safety first", group: "Watch" },
  { href: "/console/sitrep", label: "Sitrep", hint: "Duty brief", group: "Watch" },
  { href: "/console/predict", label: "Predict", hint: "AI + risk", group: "Watch" },
  { href: "/console/feed", label: "Wire", hint: "Needs & offers", group: "Watch" },
  { href: "/console/lang", label: "Language", hint: "Detect + English", group: "Watch" },
  { href: "/console/verify", label: "Conflict", hint: "Blocked vs open", group: "Watch" },
  { href: "/console/preposition", label: "Stage", hint: "Boats / med / water", group: "Stage" },
  { href: "/console/vulnerable", label: "Vulnerable", hint: "If flood comes", group: "Stage" },
  { href: "/console/cascade", label: "Knock-on", hint: "Grid cascade", group: "Stage" },
  { href: "/console/repair", label: "Repair", hint: "Roads & bridges", group: "Stage" },
  { href: "/console/map", label: "Map", hint: "Ground picture", group: "Ground" },
  { href: "/console/allocate", label: "Teams", hint: "Who is out", group: "Ground" },
  { href: "/console/reroute", label: "Reroute", hint: "Closed corridors", group: "Ground" },
  { href: "/console/approvals", label: "Approvals", hint: "Gov & NGO", group: "People" },
  { href: "/console/admins", label: "Keys", hint: "Who can sign in", group: "People" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const { incidents, sitrep } = useOps();
  const { t } = useLang();
  const life = incidents.filter((i) => i.severity === "critical").length;
  const open = incidents.filter((i) => i.status !== "resolved").length;

  useEffect(() => {
    if (ready && !session) router.replace("/");
  }, [ready, session, router]);

  useEffect(() => {
    if (!session) return;
    void ensureSeeded().then(() => startLiveFeed());
  }, [session]);

  if (!ready || !session) {
    return <BootScreen label="Opening the console" />;
  }

  let lastGroup = "";

  return (
    <div className="ops-shell">
      <aside className="ops-rail">
        <Link href="/console" className="flex items-center gap-2 px-4 pt-5 pb-4 border-b border-[var(--ink)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" className="h-10 w-10 object-contain" />
          <div>
            <div className="font-semibold leading-none">Aasra</div>
            <div className="mt-1 text-[11px] tracking-[0.16em] uppercase text-[var(--mute)]">Duty desk</div>
          </div>
        </Link>

        <div className="ops-rail-sitrep">
          <div className="ops-rail-grid">
            <div className="ops-rail-cell">
              <span>Open</span>
              <b>{open}</b>
            </div>
            <div className="ops-rail-cell">
              <span>Life</span>
              <b className={life ? "text-[var(--crit)]" : ""}>{life}</b>
            </div>
            <div className="ops-rail-cell">
              <span>Roads</span>
              <b className={sitrep?.roadsBlocked ? "text-[var(--crit)]" : ""}>{sitrep?.roadsBlocked ?? 0}</b>
            </div>
            <div className="ops-rail-cell">
              <span>Shelters</span>
              <b>{sitrep?.sheltersNearCapacity ?? 0}</b>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-auto py-1">
          {NAV.map((n) => {
            const showGroup = n.group !== lastGroup;
            lastGroup = n.group;
            const on =
              n.href === "/console/predict"
                ? path === n.href || path.startsWith("/console/predict/")
                : path === n.href;
            return (
              <div key={n.href}>
                {showGroup && <p className="ops-nav-group">{n.group}</p>}
                <Link href={n.href} className="ops-nav-link" data-on={on ? "true" : "false"}>
                  <span>
                    {n.label}
                    <small>{n.hint}</small>
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[var(--ink)] px-4 py-3 text-[13px]">
          <p className="text-[11px] tracking-[0.16em] uppercase text-[var(--mute)]">Shift clock</p>
          <Clock />
          <div className="mt-1 truncate">{session.email}</div>
          <div className="mt-3 flex gap-3 text-[var(--mute)]">
            <button type="button" onClick={resetSession}>
              {t("console.reset")}
            </button>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => router.replace("/"));
              }}
            >
              {t("console.out")}
            </button>
            <LangSwitcher />
          </div>
        </div>
      </aside>
      <div className="ops-main">{children}</div>
    </div>
  );
}

function Clock() {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleString("en-IN", {
          hour12: false,
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <time className="block tabular-nums font-semibold">{clock || "—"} IST</time>;
}
