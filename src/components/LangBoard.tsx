"use client";

import { useState } from "react";
import type { Lang } from "@/lib/types";

export function LangBoard() {
  const [text, setText] = useState("वार्ड 5 में 80 कंबल चाहिए, बारिश जारी है");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [language, setLanguage] = useState<Lang | "">("");
  const [translated, setTranslated] = useState("");
  const [model, setModel] = useState("");
  const [studied, setStudied] = useState(false);

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        studied?: boolean;
        language?: Lang;
        translated?: string;
        model?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.translated) {
        setErr(data.error || "Translate desk failed.");
        return;
      }
      setLanguage(data.language ?? "en");
      setTranslated(data.translated);
      setModel(data.model || "");
      setStudied(Boolean(data.studied));
    } catch {
      setErr("Translate desk failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="px-5 py-4 border-b border-[var(--ink)]">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Detect + English</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-none">Language</h1>
        <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
          Hindi, Telugu, or mixed radio copy. The clerk tags the source language and writes an English line the rest of
          the desk can rank.
        </p>
      </header>
      <div className="px-5 py-5 max-w-[40rem] space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full p-3 border border-[var(--ink)] bg-white text-[15px]"
        />
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => void run()}
          className="h-10 px-4 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50"
        >
          {busy ? "Clerk reading…" : "Detect and translate"}
        </button>
        {err ? <p className="text-[13px] text-[var(--crit)]">{err}</p> : null}
        {translated ? (
          <section className="border border-[var(--ink)] bg-[var(--paper-2)] px-4 py-4">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
              {language || "?"}
              {studied ? (model ? ` · ${model}` : " · clerk") : " · script heuristic"}
            </p>
            <p className="mt-2 text-[18px] font-semibold leading-snug">{translated}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
