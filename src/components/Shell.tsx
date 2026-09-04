"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { firebaseEnabled } from "@/lib/firebase";
import { ensureSeeded, injectRoadBlock, resetSession, startLiveFeed } from "@/lib/pipeline";

const NAV = [
  { href: "/console", label: "COMMAND" },
  { href: "/console/feed", label: "FEED" },
  { href: "/console/map", label: "MAP" },
  { href: "/console/allocate", label: "ALLOCATE" },
  { href: "/console/cascade", label: "CASCADE" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (ready && !session) router.replace("/");
  }, [ready, session, router]);

  useEffect(() => {
    if (!session) return;
    void ensureSeeded().then(() => startLiveFeed());
  }, [session]);

  if (!ready || !session) {
    return <div className="p-3 text-[11px] text-[var(--muted)]">AUTH CHECK…</div>;
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="h-12 shrink-0 border-b border-[var(--line)] bg-[#0a0e12] flex items-center gap-4 px-3">
        <Link href="/console" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="Aasra" className="h-9 w-9 object-contain" />
        </Link>
        <div className="display text-[15px] tracking-[0.22em] text-[#8ec4e8] hidden sm:block">RELIEFMESH</div>
        <nav className="flex items-center gap-1 text-[11px] tracking-widest">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-2 py-1 border ${
                path === n.href
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Clock />
        <div className="ml-auto flex items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--muted)]">
          <span className={firebaseEnabled() ? "text-[var(--ok)]" : "text-[var(--high)]"}>
            {firebaseEnabled() ? "FIRESTORE LIVE" : "LOCAL STORE"}
          </span>
          <span>{session.name}</span>
          <button type="button" onClick={() => void logout()} className="hover:text-[var(--crit)]">
            Sign out
          </button>
          <button type="button" onClick={() => void injectRoadBlock("NH-16")} className="hover:text-[var(--crit)]">
            Block NH-16
          </button>
          <button type="button" onClick={resetSession} className="hover:text-[var(--high)]">
            Reset feed
          </button>
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function Clock() {
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <time className="text-[11px] text-[var(--info)] tabular-nums">{clock}</time>;
}
