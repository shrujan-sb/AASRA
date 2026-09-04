"use client";

import { callDisplay, callHref } from "@/lib/sitePhone";
import { useLang } from "@/lib/i18n";

export function CallNowButton({ className = "" }: { className?: string }) {
  const { t } = useLang();
  return (
    <a href={callHref()} className={`site-btn site-btn-call ${className}`.trim()}>
      <span className="site-btn-call-dot" aria-hidden />
      {t("nav.call")}
      <span className="call-num text-[12px] font-normal opacity-90">{callDisplay()}</span>
    </a>
  );
}
