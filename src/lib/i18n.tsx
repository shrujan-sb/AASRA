"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/types";
import { COPY, type CopyKey } from "@/lib/copy";

type LangCtx = {
  lang: Lang;
  setLang: (next: Lang) => void;
  cycle: () => void;
  t: (key: CopyKey) => string;
};

const KEY = "aasra-lang";
const ORDER: Lang[] = ["en", "hi", "te"];
const Ctx = createContext<LangCtx | null>(null);

function readLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(KEY);
  if (stored === "hi" || stored === "te" || stored === "en") return stored;
  return "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(readLang());
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(KEY, next);
    document.documentElement.lang = next === "en" ? "en" : next === "hi" ? "hi" : "te";
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : lang;
  }, [lang]);

  const cycle = useCallback(() => {
    const i = ORDER.indexOf(lang);
    setLang(ORDER[(i + 1) % ORDER.length]!);
  }, [lang, setLang]);

  const t = useCallback(
    (key: CopyKey) => COPY[lang][key] || COPY.en[key] || key,
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, cycle, t }), [lang, setLang, cycle, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang outside provider");
  return ctx;
}
