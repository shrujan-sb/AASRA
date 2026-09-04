"use client";

import { useEffect, useState } from "react";
import { addAdminEmail, listenAdmins, SEED_ADMIN } from "@/lib/admins";

export function AdminsBoard() {
  const [emails, setEmails] = useState<string[]>([SEED_ADMIN]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => listenAdmins(setEmails), []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await addAdminEmail(draft);
      setDraft("");
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Could not add");
    }
  }

  return (
    <div className="h-full overflow-auto bg-[var(--paper)]">
      <header className="ops-head bg-[var(--paper)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ops-kicker">Access</p>
            <h1>Desk keys</h1>
            <p className="mt-1.5 text-[13px] text-[var(--mute)]">Only these Gmail addresses can open the admin portal.</p>
          </div>
          <span className="ops-chip ops-chip-normal">{emails.length} keys</span>
        </div>
      </header>
      <div className="p-4 max-w-2xl">
        <form onSubmit={(e) => void add(e)} className="ops-dossier flex gap-2 items-center">
          <input
            type="email"
            required
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="name@gmail.com"
            className="flex-1 h-10 px-3 border border-[var(--ink)] bg-white"
          />
          <button type="submit" className="h-10 px-4 bg-[var(--ink)] text-[var(--paper)]">
            Add
          </button>
        </form>
        {err && <p className="mt-2 text-[var(--crit)]">{err}</p>}

        <ul className="mt-3 grid sm:grid-cols-2 gap-2">
          {emails.map((email) => (
            <li key={email} className="ops-dossier">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium break-all">{email}</p>
                <span className={email === SEED_ADMIN ? "ops-chip ops-chip-critical" : "ops-chip ops-chip-ok"}>
                  {email === SEED_ADMIN ? "root" : "desk"}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[var(--mute)]">
                {email === SEED_ADMIN ? "Seed key — cannot drop this desk." : "Can sign the console."}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
