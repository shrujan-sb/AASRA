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
    <div className="h-full overflow-auto max-w-xl">
      <header className="px-5 py-4 border-b border-[var(--ink)]">
        <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--mute)]">Access</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-none">Desk keys</h1>
        <p className="mt-2 text-[14px] text-[var(--mute)]">Only these Gmail addresses can open the admin portal.</p>
      </header>
      <div className="px-5 py-5">
      <form onSubmit={(e) => void add(e)} className="flex gap-2">
        <input
          type="email"
          required
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="name@gmail.com"
          className="flex-1 h-11 px-3 border border-[var(--ink)] bg-transparent"
        />
        <button type="submit" className="h-11 px-4 bg-[var(--ink)] text-[var(--paper)]">
          Add
        </button>
      </form>
      {err && <p className="mt-2 text-[var(--crit)]">{err}</p>}

      <ul className="mt-6">
        {emails.map((email) => (
          <li key={email} className="py-2 border-t border-[var(--rule)]">
            {email}
            {email === SEED_ADMIN ? <span className="text-[var(--mute)]"> · root</span> : null}
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
