"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { resetSession } from "@/lib/pipeline";
import { firebaseEnabled } from "@/lib/firebase";

const NAV = [
  { href: "/console", label: "COMMAND" },
  { href: "/console/feed", label: "INTAKE" },
  { href: "/console/map", label: "MAP" },
  { href: "/console/allocate", label: "ASSIGN" },
  { href: "/console/cascade", label: "CASCADE" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-full flex flex-col">
      <header className="h-12 shrink-0 border-b border-[var(--line)] bg-[#0a0e12] flex items-center gap-4 px-3">
        <Link href="/console" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="Aasra" className="h-9 w-9 object-contain" />
          <span className="display text-sm tracking-[0.2em] text-[#8ec4e8]">AASRA</span>
        </Link>
        <nav className="flex gap-1 text-[11px] tracking-widest">
          {NAV.map((n) => {
            const on = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`px-2 py-1 border ${on ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-[10px] text-[var(--muted)]">
          <span className={firebaseEnabled() ? "text-[var(--ok)]" : "text-[var(--high)]"}>
            {firebaseEnabled() ? "FIRESTORE LIVE" : "LOCAL STORE"}
          </span>
          <span className="text-[var(--text)]">{clock}</span>
          <span>{session?.name}</span>
          <button type="button" className="uppercase tracking-widest hover:text-[var(--crit)]" onClick={() => void logout()}>
            Sign out
          </button>
          <button type="button" className="uppercase tracking-widest hover:text-[var(--high)]" onClick={resetSession}>
            Reset feed
          </button>
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
