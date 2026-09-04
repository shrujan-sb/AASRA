"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { isSeedAdmin, normEmail, SEED_ADMIN } from "@/lib/adminEmails";
import { getAll, hydrateLocal, listen, upsert } from "@/lib/db";
import { getDb } from "@/lib/firebase";

export { SEED_ADMIN, normEmail } from "@/lib/adminEmails";

const COL = "admins";

export type AdminRow = { id: string; email: string };

function remember(email: string) {
  const id = normEmail(email);
  hydrateLocal();
  void upsert(COL, id, { email: id });
}

export async function ensureSeedAdmin(): Promise<void> {
  hydrateLocal();
  const rows = getAll<AdminRow>(COL);
  if (rows.some((r) => r.email === SEED_ADMIN)) return;
  remember(SEED_ADMIN);
}

export function listAdmins(): string[] {
  hydrateLocal();
  const rows = getAll<AdminRow>(COL).map((r) => r.email);
  const set = new Set([SEED_ADMIN, ...rows.map(normEmail)]);
  return [...set];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return listAdmins().includes(normEmail(email));
}

export async function checkAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const id = normEmail(email);
  if (isSeedAdmin(id) || isAdminEmail(id)) {
    remember(id);
    return true;
  }

  try {
    const res = await fetch(`/api/admins?email=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = (await res.json()) as { admin?: boolean };
    if (data.admin) {
      remember(id);
      return true;
    }
  } catch {
    /* network */
  }

  const fs = getDb();
  if (fs) {
    try {
      const snap = await getDoc(doc(fs, COL, id));
      if (snap.exists()) {
        remember(id);
        return true;
      }
    } catch {
      /* rules / offline */
    }
  }

  return false;
}

export async function addAdminEmail(email: string): Promise<void> {
  const id = normEmail(email);
  if (!id.includes("@")) throw new Error("Enter a valid email");
  remember(id);
  const fs = getDb();
  if (fs) {
    await setDoc(doc(fs, COL, id), { id, email: id }, { merge: true });
  }
  const res = await fetch("/api/admins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: id }),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
  if (!fs && !data?.ok) {
    throw new Error("Could not save this desk key");
  }
}

export function listenAdmins(cb: (emails: string[]) => void): () => void {
  void ensureSeedAdmin();
  return listen<AdminRow>(COL, (rows) => {
    const set = new Set([SEED_ADMIN, ...rows.map((r) => normEmail(r.email))]);
    cb([...set]);
  });
}
