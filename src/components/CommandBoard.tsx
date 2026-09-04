"use client";

import { useOps } from "@/lib/useOps";

export function CommandBoard() {
  const { incidents, resources, sitrep, assignments, logs, events } = useOps();
  const offers = events.filter((e) => e.type === "offer").slice(0, 6);
  const top = incidents[0];

  return (
    <div className="h-full overflow-auto px-6 md:px-10 py-8">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-6 border-b-2 border-[var(--rule)] pb-8">
        <div>
          <div className="text-lg text-[var(--mute)]">Now on the desk</div>
          <div className="flex items-end gap-4">
            <span className="text-7xl md:text-8xl font-semibold leading-none tabular-nums">{sitrep?.activeIncidents ?? 0}</span>
            <span className="mark text-6xl md:text-7xl text-[var(--crit)] pb-1">active</span>
          </div>
        </div>
        <Stat n={sitrep?.critical ?? 0} label="critical" hot />
        <Stat n={sitrep?.high ?? 0} label="high" />
        <Stat n={sitrep?.roadsBlocked ?? 0} label="roads shut" hot />
        <Stat n={sitrep?.freeUnits ?? 0} label="units free" />
        <div className="flex-1 min-w-[260px] max-w-xl">
          <p className="text-2xl font-medium leading-snug">{sitrep?.headline ?? "Waiting on first intake."}</p>
          {sitrep?.predictions.map((p) => (
            <p key={p} className="mt-2 text-lg text-[var(--mute)]">
              {p}
            </p>
          ))}
        </div>
      </div>

      {top && (
        <p className="mt-6 text-2xl">
          Top of queue: <span className="font-semibold">{top.title}</span>{" "}
          <span className="mark text-4xl text-[var(--crit)]">{top.severity}</span>
        </p>
      )}

      <div className="mt-8 grid lg:grid-cols-[1.35fr_0.85fr] gap-12">
        <section>
          <h2 className="text-3xl font-semibold">
            Priority <span className="mark text-5xl text-[var(--crit)]">queue</span>
          </h2>
          <ul className="mt-4 divide-y-2 divide-[var(--rule)]">
            {incidents.map((i) => (
              <li key={i.id} className="py-4 flash-in grid grid-cols-[4rem_1fr_auto] gap-4 items-start">
                <span className="text-4xl font-semibold tabular-nums">{String(i.rank).padStart(2, "0")}</span>
                <div>
                  <div className="text-xl font-medium">{i.title}</div>
                  <div className="mt-1 text-lg text-[var(--mute)]">
                    {i.locationLabel} · {i.verification} · {i.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`mark text-4xl ${i.severity === "critical" ? "text-[var(--crit)]" : i.severity === "high" ? "text-[var(--warn)]" : "text-[var(--ok)]"}`}>
                    {i.severity}
                  </div>
                  <div className="text-lg tabular-nums">{i.priorityScore}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-10">
          <section>
            <h2 className="text-3xl font-semibold">
              Resource <span className="mark text-5xl">pool</span>
            </h2>
            <ul className="mt-4 divide-y divide-[var(--rule)]">
              {resources.map((r) => (
                <li key={r.id} className="py-3 flex justify-between gap-4 text-lg">
                  <span>
                    {r.callsign}
                    <span className="text-[var(--mute)]"> · {r.locationId}</span>
                  </span>
                  <span className={r.status === "free" ? "text-[var(--ok)] font-medium" : "mark text-3xl text-[var(--warn)] leading-none"}>
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-3xl font-semibold">Offers</h2>
            <ul className="mt-3 space-y-3 text-lg">
              {offers.map((o) => (
                <li key={o.id}>
                  {o.quantity} {o.resource} from {o.source}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-3xl font-semibold">
              Agent <span className="mark text-5xl">ticker</span>
            </h2>
            <ul className="mt-3 space-y-3">
              {assignments.slice(0, 4).map((a) => (
                <li key={a.id} className="text-lg leading-snug">
                  <span className="mark text-3xl text-[var(--crit)] mr-2">{a.status === "rerouted" ? "reroute" : "assign"}</span>
                  {a.reason}
                </li>
              ))}
              {logs.slice(0, 8).map((l) => (
                <li key={l.id} className="text-base text-[var(--mute)]">
                  <span className="font-medium text-[var(--ink)]">{l.agent}</span> {l.message}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ n, label, hot }: { n: number; label: string; hot?: boolean }) {
  return (
    <div>
      <div className="text-5xl font-semibold tabular-nums leading-none">{n}</div>
      <div className={`mark text-4xl mt-1 ${hot ? "text-[var(--crit)]" : ""}`}>{label}</div>
    </div>
  );
}
