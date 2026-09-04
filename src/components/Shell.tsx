"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BootScreen } from "@/components/site/BootScreen";
import { useAuth } from "@/lib/auth";
import { ensureSeeded, resetSession, startLiveFeed } from "@/lib/pipeline";
import { useOps } from "@/lib/useOps";

const NAV = [
  { href: "/console", label: "Needs", hint: "Ranked tickets" },
  { href: "/console/predict", label: "Predict", hint: "Before landfall" },
  { href: "/console/feed", label: "Wire", hint: "Raw intake" },
  { href: "/console/map", label: "Map", hint: "Ground picture" },
  { href: "/console/allocate", label: "Teams", hint: "Who is out" },
  { href: "/console/cascade", label: "Knock-on", hint: "Repair order" },
  { href: "/console/approvals", label: "Approvals", hint: "Gov & NGO" },
  { href: "/console/admins", label: "Keys", hint: "Who can sign in" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const { incidents, sitrep } = useOps();
  const life = incidents.filter((i) => i.severity === "critical").length;

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

        <div className="px-4 py-3 border-b border-[var(--rule)] text-[13px]">
          <div className="flex justify-between">
            <span className="text-[var(--mute)]">Open</span>
            <span className="tabular-nums font-semibold">{incidents.length}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-[var(--mute)]">Life-safety</span>
            <span className={`tabular-nums font-semibold ${life ? "text-[var(--crit)]" : ""}`}>{life}</span>
          </div>
          {sitrep?.headline && (
            <p className="mt-2 text-[12px] leading-snug text-[var(--mute)]">{sitrep.headline}</p>
          )}
        </div>

        <nav className="flex-1 overflow-auto py-2">
          {NAV.map((n) => {
            const on = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`block px-4 py-2.5 border-l-4 ${
                  on ? "border-[var(--crit)] bg-white font-semibold" : "border-transparent text-[var(--mute)]"
                }`}
              >
                <div>{n.label}</div>
                <div className="text-[11px] font-normal tracking-wide uppercase">{n.hint}</div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[var(--ink)] px-4 py-3 text-[13px]">
          <Clock />
          <div className="mt-1 truncate">{session.email}</div>
          <div className="mt-3 flex gap-3 text-[var(--mute)]">
            <button type="button" onClick={resetSession}>
              Reset seed
            </button>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => router.replace("/"));
              }}
            >
              Sign out
            </button>
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
  return <time className="tabular-nums font-semibold">{clock} IST</time>;
}
