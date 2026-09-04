"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { firebaseEnabled } from "@/lib/firebase";
import { ensureSeeded, injectRoadBlock, resetSession, startLiveFeed } from "@/lib/pipeline";

const NAV = [
  { href: "/console", label: "Command" },
  { href: "/console/feed", label: "Intake" },
  { href: "/console/map", label: "Map" },
  { href: "/console/allocate", label: "Assign" },
  { href: "/console/cascade", label: "Cascade" },
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
    return <div className="p-10 text-xl">Checking duty pass…</div>;
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="shrink-0 border-b-2 border-[var(--rule)] px-6 md:px-10 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <Link href="/console" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="Aasra" className="h-14 w-14 object-contain mix-blend-multiply" />
          <span className="text-2xl font-semibold tracking-tight">Aasra</span>
        </Link>
        <nav className="flex flex-wrap items-end gap-6 text-xl">
          {NAV.map((n) => {
            const on = path === n.href;
            return (
              <Link key={n.href} href={n.href} className={on ? "mark text-4xl text-[var(--crit)] leading-none" : "text-[var(--mute)]"}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-5 text-base">
          <Clock />
          <span className={firebaseEnabled() ? "text-[var(--ok)]" : "text-[var(--warn)]"}>
            {firebaseEnabled() ? "Firestore" : "Local store"}
          </span>
          <span>{session.name}</span>
          <button type="button" onClick={() => void injectRoadBlock("NH-16")} className="underline decoration-2 underline-offset-4">
            Block NH-16
          </button>
          <button type="button" onClick={resetSession} className="underline decoration-2 underline-offset-4">
            Reset
          </button>
          <button type="button" onClick={() => void logout()} className="underline decoration-2 underline-offset-4">
            Sign out
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
  return <time className="tabular-nums font-medium">{clock}</time>;
}
