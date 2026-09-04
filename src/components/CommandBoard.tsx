"use client";

import { useOps } from "@/lib/useOps";

function Stat({ k, v, tone }: { k: string; v: number | string; tone?: string }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--panel)] px-3 py-2 min-w-[110px]">
      <div className="text-[9px] tracking-[0.2em] text-[var(--muted)]">{k}</div>
      <div className={`display text-2xl leading-none mt-1 ${tone ?? ""}`}>{v}</div>
    </div>
  );
}

export function CommandBoard() {
  const { incidents, resources, sitrep, assignments, logs } = useOps();
  return (
    <div className="h-full grid grid-rows-[auto_1fr] gap-2 p-2">
      <div className="flex flex-wrap gap-2">
        <Stat k="ACTIVE" v={sitrep?.activeIncidents ?? 0} />
        <Stat k="CRITICAL" v={sitrep?.critical ?? 0} tone="text-[var(--crit)]" />
        <Stat k="HIGH" v={sitrep?.high ?? 0} tone="text-[var(--high)]" />
        <Stat k="ROADS BLOCKED" v={sitrep?.roadsBlocked ?? 0} tone="text-[var(--crit)]" />
        <Stat k="UNITS FREE" v={sitrep?.freeUnits ?? 0} tone="text-[var(--ok)]" />
        <Stat k="COMMITTED" v={sitrep?.assignedUnits ?? 0} tone="text-[var(--info)]" />
        <div className="flex-1 border border-[var(--line)] bg-[var(--panel)] px-3 py-2 min-w-[240px]">
          <div className="text-[9px] tracking-[0.2em] text-[var(--muted)]">SITREP</div>
          <div className="text-[12px] mt-1">{sitrep?.headline ?? "Awaiting intake"}</div>
          <div className="text-[10px] text-[var(--high)] mt-1">
            {sitrep?.predictions.map((p) => (
              <div key={p}>{p}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr_0.9fr] gap-2 min-h-0">
        <section className="border border-[var(--line)] bg-[var(--panel)] overflow-auto">
          <h2 className="display sticky top-0 bg-[var(--panel)] px-2 py-1 text-[11px] tracking-[0.18em] border-b border-[var(--line)]">
            PRIORITY QUEUE
          </h2>
          <table className="w-full text-[11px]">
            <thead className="text-[var(--muted)] text-left">
              <tr>
                <th className="px-2 py-1">RK</th>
                <th>SEV</th>
                <th>NEED</th>
                <th>LOC</th>
                <th>VRF</th>
                <th>SCR</th>
                <th>ST</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id} className="border-t border-[var(--line)] flash-in">
                  <td className="px-2 py-1 text-[var(--muted)]">{String(i.rank).padStart(2, "0")}</td>
                  <td className={`sev-${i.severity}`}>{i.severity.toUpperCase()}</td>
                  <td>{i.title}</td>
                  <td>{i.locationId}</td>
                  <td className={`tag-${i.verification}`}>{i.verification}</td>
                  <td>{i.priorityScore}</td>
                  <td>{i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="border border-[var(--line)] bg-[var(--panel)] overflow-auto">
          <h2 className="display sticky top-0 bg-[var(--panel)] px-2 py-1 text-[11px] tracking-[0.18em] border-b border-[var(--line)]">
            RESOURCE POOL
          </h2>
          {resources.map((r) => (
            <div key={r.id} className="flex justify-between gap-2 px-2 py-1 border-b border-[var(--line)] text-[11px]">
              <span>
                {r.callsign}
                <span className="text-[var(--muted)]"> · {r.locationId}</span>
              </span>
              <span className={r.status === "free" ? "text-[var(--ok)]" : "text-[var(--high)]"}>{r.status}</span>
            </div>
          ))}
        </section>
        <section className="border border-[var(--line)] bg-[var(--panel)] overflow-auto">
          <h2 className="display sticky top-0 bg-[var(--panel)] px-2 py-1 text-[11px] tracking-[0.18em] border-b border-[var(--line)]">
            AGENT TICKER
          </h2>
          {assignments.slice(0, 6).map((a) => (
            <div key={a.id} className="px-2 py-1 text-[10px] border-b border-[var(--line)] text-[var(--info)]">
              {a.status === "rerouted" ? "REROUTE " : "ASSIGN "}
              {a.reason}
            </div>
          ))}
          {logs.slice(0, 18).map((l) => (
            <div key={l.id} className="px-2 py-0.5 text-[10px] text-[var(--muted)]">
              <span className="text-[var(--accent)]">{l.agent}</span> {l.message}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
