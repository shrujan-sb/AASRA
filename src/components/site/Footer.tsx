"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--ink)] bg-[var(--paper)]">
      <div className="site-wrap grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" className="h-10 w-10 object-contain" />
          <p className="mt-4 font-semibold">Aasra</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--mute)]">
            ReliefMesh for a Krishna-delta flood sector: public reports, a Featherless clerk, verified field teams, and
            officers who rank one queue.
          </p>
        </div>
        <div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Three doors</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link href="/report">Report help — no login</Link>
            </li>
            <li>
              <Link href="/join">Support team — ID + area</Link>
            </li>
            <li>
              <Link href="/#desk">Admin — allow-list Google</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">The mesh</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link href="/how-it-works">How a ticket is ranked</Link>
            </li>
            <li>
              <Link href="/about">About ReliefMesh</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Write</p>
          <p className="mt-3 text-[15px]">
            <a href="mailto:aasra.support@gmail.com">aasra.support@gmail.com</a>
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--mute)]">
            Applications and decisions go out from this inbox. Do not send medical emergencies here — call local
            services first.
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--rule)]">
        <div className="site-wrap flex flex-col gap-2 py-4 text-[13px] text-[var(--mute)] sm:flex-row sm:justify-between">
          <p>Prepare · Respond · Rebuild</p>
          <p>Demo sector control — not a substitute for 112 / 108</p>
        </div>
      </div>
    </footer>
  );
}
