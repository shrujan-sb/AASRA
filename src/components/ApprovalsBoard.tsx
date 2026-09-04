"use client";

import { useEffect, useState } from "react";
import { approveSupport, listenApplications } from "@/lib/support";
import { upsert } from "@/lib/db";
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
      <header className="sticky top-0 z-10 bg-[var(--paper)] px-5 py-4 border-b border-[var(--ink)]">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Gate</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-none">Approvals</h1>
        <p className="mt-2 max-w-[62ch] text-[14px] text-[var(--mute)]">
          Government and NGO chits. Allow or reject; that Gmail gets the desk letter.
        </p>
        {notice && <p className="mt-2 text-[15px]">{notice}</p>}
      </header>

      {pending.length === 0 && <p className="px-5 py-6 text-[var(--mute)]">No pending applications.</p>}

      <ul className="p-5 space-y-4">
        {pending.map((r) => (
          <li key={r.id} className="ops-dossier">
            <div className="font-semibold">
              {r.name} · {r.kind === "government" ? "Government" : "NGO / volunteer"}
            </div>
            <div className="text-[var(--mute)] mt-1">
              {r.email}
              {r.department ? ` · ${r.designation}, ${r.department}` : ""}
              {r.orgName ? ` · ${r.volunteerRole}, ${r.orgName}` : ""}
              {r.areaLabel ? ` · ${r.areaLabel}` : ""}
            </div>
            <div className="text-[14px] mt-1 text-[var(--mute)]">
              {r.idNumber ? `ID ${r.idNumber}` : ""}
              {r.registrationNo ? `Reg ${r.registrationNo}` : ""} {r.phone ?? ""}
            </div>
            {r.note && <p className="mt-2">{r.note}</p>}
            {r.photoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoDataUrl} alt="ID" className="mt-3 max-h-56 object-contain border border-[var(--rule)]" />
            )}
            <div className="mt-3 flex gap-2">
              <button type="button" className="h-10 px-4 bg-[var(--ink)] text-white" onClick={() => void decide(r, true)}>
                Yes — allow
              </button>
              <button type="button" className="h-10 px-4 border border-[var(--ink)] bg-white" onClick={() => void decide(r, false)}>
                No — reject
              </button>
            </div>
          </li>
        ))}
      </ul>

      {rest.length > 0 && (
        <ul className="px-5 pb-8">
          {rest.map((r) => (
            <li key={r.id} className="py-2 border-t border-[var(--rule)] text-[var(--mute)]">
              {r.name} · {r.status} · {r.email}
              {r.areaLabel ? ` · ${r.areaLabel}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
