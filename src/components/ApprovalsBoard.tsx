"use client";

import { useEffect, useState } from "react";
import { approveSupport, listenApplications } from "@/lib/support";
import { upsert } from "@/lib/db";
import { parseSupportKind, supportKindLabel } from "@/lib/supportKind";
import type { SupportApplication } from "@/lib/types";

export function ApprovalsBoard() {
  const [rows, setRows] = useState<SupportApplication[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => listenApplications(setRows), []);

  async function decide(row: SupportApplication, allowed: boolean) {
    setNotice("");
    const next: SupportApplication = {
      ...row,
      status: allowed ? "allowed" : "rejected",
      decidedAt: Date.now(),
    };
    await upsert("applications", row.id, next);
    if (allowed) await approveSupport(row);
    const res = await fetch("/api/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: row.email,
        name: row.name,
        kind: row.kind,
        allowed,
        orgName: row.orgName || row.department,
        areaLabel: row.areaLabel,
        lat: row.lat,
        lng: row.lng,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; mailed?: boolean; to?: string; error?: string };
    if (!res.ok || !data.ok) {
      setNotice(data.error || "Saved the decision, but email did not send.");
      return;
    }
    setNotice(
      data.mailed
        ? `${allowed ? "Allowed" : "Rejected"}. Email sent to ${data.to}.`
        : `${allowed ? "Allowed" : "Rejected"}. Add Gmail env to send mail.`,
    );
  }

  const pending = rows.filter((r) => r.status === "pending");
  const rest = rows.filter((r) => r.status !== "pending");

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="ops-head bg-[var(--paper)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ops-kicker">Gate</p>
            <h1>Approvals</h1>
            <p className="mt-1.5 max-w-[62ch] text-[13px] text-[var(--mute)]">
              Government, NGO, and volunteer chits. The clerk reads the file first. You can still override.
            </p>
          </div>
          <span className="ops-chip ops-chip-high">{pending.length} pending</span>
        </div>
        {notice && <p className="mt-2 text-[14px]">{notice}</p>}
      </header>

      {pending.length === 0 && <p className="px-4 py-5 text-[var(--mute)]">No pending applications.</p>}

      <ul className="p-4 grid lg:grid-cols-2 gap-3">
        {pending.map((r) => (
          <li key={r.id} className="ops-dossier" data-sev={r.clerk && !r.clerk.allow ? "high" : undefined}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold leading-snug">{r.name}</p>
                <p className="mt-0.5 text-[12px] text-[var(--mute)]">
                  {supportKindLabel(parseSupportKind(r.kind))}
                </p>
              </div>
              {r.clerk && (
                <span className={r.clerk.allow ? "ops-chip ops-chip-ok" : "ops-chip ops-chip-high"}>
                  {r.clerk.allow ? "allow" : "hold"} · {Math.round(r.clerk.confidence * 100)}%
                </span>
              )}
            </div>
            <div className="mt-2 text-[13px] text-[var(--mute)]">
              {r.email}
              {r.department ? ` · ${r.designation}, ${r.department}` : ""}
              {r.orgName ? ` · ${r.volunteerRole}, ${r.orgName}` : ""}
              {r.areaLabel ? ` · ${r.areaLabel}` : ""}
            </div>
            <div className="text-[12px] mt-1 text-[var(--mute)]">
              {r.idNumber ? `ID ${r.idNumber}` : ""}
              {r.registrationNo ? `Reg ${r.registrationNo}` : ""} {r.phone ?? ""}
            </div>
            {r.note && <p className="mt-2 text-[14px]">{r.note}</p>}
            {r.clerk && (
              <div className="mt-2 border border-[var(--ink)] bg-[var(--paper-2)] px-3 py-2 text-[13px]">
                <p className="ops-kicker">Clerk ruling</p>
                <p className="mt-1">{r.clerk.summary}</p>
                {r.clerk.flags?.length ? (
                  <p className="mt-1 text-[var(--mute)]">{r.clerk.flags.join(" · ")}</p>
                ) : null}
              </div>
            )}
            {r.photoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoDataUrl} alt="ID" className="mt-2 max-h-44 object-contain border border-[var(--rule)]" />
            )}
            <div className="mt-3 flex gap-2">
              <button type="button" className="h-9 px-3 bg-[var(--ink)] text-white text-[13px]" onClick={() => void decide(r, true)}>
                Yes — allow
              </button>
              <button type="button" className="h-9 px-3 border border-[var(--ink)] bg-white text-[13px]" onClick={() => void decide(r, false)}>
                No — reject
              </button>
            </div>
          </li>
        ))}
      </ul>

      {rest.length > 0 && (
        <div className="px-4 pb-8">
          <p className="ops-kicker mb-2">Closed</p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {rest.map((r) => (
              <li key={r.id} className="ops-dossier py-2">
                <div className="flex justify-between gap-2">
                  <span>{r.name}</span>
                  <span className={r.status === "allowed" ? "ops-chip ops-chip-ok" : "ops-chip ops-chip-critical"}>
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--mute)]">
                  {r.email}
                  {r.areaLabel ? ` · ${r.areaLabel}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
