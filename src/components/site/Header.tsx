"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ink)] bg-[#f3f1ec]">
      <div className="site-wrap flex h-[72px] items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" className="h-8 w-8 object-contain" />
          <span className="text-[18px] font-semibold tracking-tight">Aasra</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-[15px]">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={path === l.href ? "font-medium" : "text-[var(--mute)] hover:text-[var(--ink)]"}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden md:flex items-center gap-3">
          <Link href="/join" className="site-btn site-btn-paper text-[14px]">
            Support team
          </Link>
          <Link href="/report" className="site-btn site-btn-ink text-[14px]">
            Report help
          </Link>
        </div>
        <button
          type="button"
          className="ml-auto md:hidden text-[14px] font-medium"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-[var(--rule)] bg-[#f3f1ec]">
          <div className="site-wrap flex flex-col gap-1 py-4">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="py-2" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <Link href="/join" className="py-2" onClick={() => setOpen(false)}>
              Support team
            </Link>
            <Link href="/report" className="mt-2 site-btn site-btn-ink" onClick={() => setOpen(false)}>
              Report help
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
