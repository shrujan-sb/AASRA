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
            A public desk for flood-sector reports, verified field teams, and the officers who rank the queue.
          </p>
        </div>
        <div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Desk</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link href="/report">Report help</Link>
            </li>
            <li>
              <Link href="/join">Join support</Link>
            </li>
            <li>
              <Link href="/how-it-works">How a ticket moves</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Aasra</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link href="/about">About the mesh</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <Link href="/#desk">Admin on the duty board</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Write</p>
          <p className="mt-3 text-[15px]">
            <a href="mailto:aasra.support@gmail.com">aasra.support@gmail.com</a>
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--mute)]">
            Applications and decisions go out from this inbox. Do not send medical emergencies here — call local services first.
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
