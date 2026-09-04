"use client";

import { useEffect, useMemo, useState } from "react";
import { fallbackVulnerable } from "@/lib/delta";
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
};

export function VulnerableBoard() {
  const { incidents, hazards } = useOps();
  const instant = useMemo(() => fallbackVulnerable({ incidents, hazards }), [incidents, hazards]);
  const [sites, setSites] = useState<PrepVulnerable[]>(instant.sites);
  const [headline, setHeadline] = useState(instant.headline);
  const [windowHours, setWindowHours] = useState(instant.windowHours);
  const [model, setModel] = useState("");
  const [studied, setStudied] = useState(false);

  useEffect(() => {
    setSites(instant.sites);
    setHeadline(instant.headline);
    setWindowHours(instant.windowHours);
  }, [instant]);

  useEffect(() => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 2500);
    void fetch("/api/vulnerable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incidents: incidents.map((i) => ({
          id: i.id,
          title: i.title,
          locationId: i.locationId,
          locationLabel: i.locationLabel,
          severity: i.severity,
          status: i.status,
        })),
        hazards: hazards.map((h) => ({ id: h.id, label: h.label, status: h.status, roadId: h.roadId })),
      }),
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((data: VulnerableResponse) => {
        if (!data.ok || !data.sites?.length) return;
        setSites(data.sites);
        setHeadline(data.headline || data.sites[0]?.why || instant.headline);
        setWindowHours(data.windowHours ?? 48);
        setModel(data.model || "");
        setStudied(Boolean(data.studied));
      })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timer));
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [incidents, hazards, instant.headline]);

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">If flood comes</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-none">Vulnerable</h1>
      </header>

      <div className="px-5 py-5 space-y-6">
        <section className="border border-[var(--ink)] bg-[var(--paper-2)] px-4 py-4">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">
            {windowHours}h window
            {studied ? (model ? ` · ${model}` : "") : " · desk list"}
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
    </div>
  );
}
