"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="mt-auto border-t border-[var(--ink)] bg-[var(--paper)]">
      <div className="site-wrap grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" className="h-10 w-10 object-contain" />
          <p className="mt-4 font-semibold">Aasra</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--mute)]">
            {t("footer.blurb")}
          </p>
        </div>
        <div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">{t("footer.three")}</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link href="/report">{t("footer.report")}</Link>
            </li>
            <li>
              <Link href="/join">{t("footer.join")}</Link>
            </li>
            <li>
              <Link href="/#desk">{t("footer.admin")}</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">{t("footer.mesh")}</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link href="/how-it-works">{t("footer.how")}</Link>
            </li>
            <li>
              <Link href="/about">{t("footer.about")}</Link>
            </li>
            <li>
              <Link href="/contact">{t("footer.contact")}</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">{t("footer.write")}</p>
          <p className="mt-3 text-[15px]">
            <a href="mailto:aasra.support@gmail.com">aasra.support@gmail.com</a>
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--mute)]">
            {t("footer.mail")}
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--rule)]">
        <div className="site-wrap flex flex-col gap-2 py-4 text-[13px] text-[var(--mute)] sm:flex-row sm:justify-between">
          <p>{t("footer.tag")}</p>
          <p>{t("footer.demo")}</p>
        </div>
      </div>
    </footer>
  );
}
