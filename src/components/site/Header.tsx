"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useLang } from "@/lib/i18n";

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const links = [
    { href: "/how-it-works", label: t("nav.how") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ink)] bg-[var(--paper)]">
      <div className="site-wrap flex h-[72px] items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" className="h-8 w-8 object-contain" />
          <span className="text-[18px] font-semibold tracking-tight">Aasra</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-[15px]">
          {links.map((l) => (
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
          <LangSwitcher />
          <Link href="/join" className="site-btn site-btn-paper text-[14px]">
            {t("nav.support")}
          </Link>
          <Link href="/report" className="site-btn site-btn-ink text-[14px]">
            {t("nav.report")}
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-3 md:hidden">
          <LangSwitcher />
          <button
            type="button"
            className="text-[14px] font-medium"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? t("nav.close") : t("nav.menu")}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-[var(--rule)] bg-[var(--paper)]">
          <div className="site-wrap flex flex-col gap-1 py-4">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="py-2" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <Link href="/join" className="py-2" onClick={() => setOpen(false)}>
              {t("nav.support")}
            </Link>
            <Link href="/report" className="mt-2 site-btn site-btn-ink" onClick={() => setOpen(false)}>
              {t("nav.report")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
