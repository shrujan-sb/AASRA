"use client";

import { useLang } from "@/lib/i18n";

const MARK: Record<string, string> = { en: "EN", hi: "हिं", te: "తె" };

export function LangSwitcher({ className = "" }: { className?: string }) {
  const { lang, cycle, t } = useLang();
  return (
    <button
      type="button"
      className={`lang-switch ${className}`.trim()}
      onClick={cycle}
      aria-label={t("lang.label")}
      title={t("lang.label")}
    >
      {MARK[lang] ?? "EN"}
    </button>
  );
}
