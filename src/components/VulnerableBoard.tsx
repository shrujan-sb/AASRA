"use client";

import { useEffect, useState } from "react";
import { wardById } from "@/lib/geo";
import type { PrepAssetKind, PrepVulnerable } from "@/lib/types";
import { useOps } from "@/lib/useOps";

const PREP_KINDS: PrepAssetKind[] = ["school", "hospital", "elderly", "road", "substation", "shelter"];

const KIND_LABEL: Record<PrepAssetKind, string> = {
  school: "Schools",
  hospital: "Hospitals",
  elderly: "Elderly homes",
  road: "Roads",
  substation: "Substations",
  shelter: "Shelters",
};

type VulnerableResponse = {
  ok?: boolean;
  studied?: boolean;
  model?: string;
  windowHours?: number;
  headline?: string;
  sites?: PrepVulnerable[];
  fallback?: boolean;
  error?: string;
};

export function VulnerableBoard() {
  const { incidents, hazards } = useOps();
  const [sites, setSites] = useState<PrepVulnerable[]>([]);
  const [headline, setHeadline] = useState("");
  const [windowHours, setWindowHours] = useState(48);
  const [model, setModel] = useState("");
  const [studied, setStudied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/vulnerable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidents, hazards }),
      });
      const data = (await res.json()) as VulnerableResponse;
      if (!res.ok || !data.ok || !data.sites?.length) {
        setErr(data.error || "Vulnerable desk failed.");
        return;
      }
      setSites(data.sites);
      setHeadline(data.headline || data.sites[0].why);
      setWindowHours(data.windowHours ?? 48);
      setModel(data.model || "");
      setStudied(Boolean(data.studied));
    } catch {
      setErr("Vulnerable desk failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">If flood comes</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-none">Vulnerable</h1>
        {err ? <p className="mt-2 text-[13px] text-[var(--crit)]">{err}</p> : null}
      </header>

      {!sites.length ? (
        <p className="px-5 py-8 text-[16px] text-[var(--mute)]">{busy ? "Loading sites…" : "No sites yet."}</p>
      ) : (
        <div className="px-5 py-5 space-y-6">
          <section className="border border-[var(--ink)] bg-[var(--paper-2)] px-4 py-4">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
              {windowHours}h window
              {studied ? (model ? ` · ${model}` : "") : " · desk heuristic"}
            </p>
            <p className="mt-2 text-[20px] font-semibold leading-snug">{headline}</p>
          </section>

          {PREP_KINDS.map((kind) => {
            const rows = sites.filter((s) => s.kind === kind);
            if (!rows.length) return null;
            return (
              <section key={kind}>
                <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">{kind}</p>
                <h2 className="mt-1 text-[20px] font-semibold">{KIND_LABEL[kind]}</h2>
                <ul className="mt-3 border border-[var(--ink)] bg-white">
                  {rows.map((s, i) => (
                    <li key={`${s.kind}-${s.name}-${i}`} className="border-b border-[var(--rule)] last:border-0 px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-[13px] text-[var(--mute)]">
                          {s.wardId ? wardById(s.wardId).name : "—"}
                        </span>
                      </div>
                      <p className="mt-1 text-[14px] leading-snug text-[var(--mute)]">{s.why}</p>
                      <p className="mt-1 text-[14px] leading-snug">{s.action}</p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
