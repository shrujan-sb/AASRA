"use client";

import { upsert, getAll, listen, hydrateLocal } from "@/lib/db";

export const SEED_ADMIN = "shrujan29.29@gmail.com";
const COL = "admins";

export type AdminRow = { id: string; email: string };

export function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function ensureSeedAdmin(): Promise<void> {
  hydrateLocal();
  const rows = getAll<AdminRow>(COL);
  if (rows.some((r) => r.email === SEED_ADMIN)) return;
  await upsert(COL, SEED_ADMIN, { email: SEED_ADMIN });
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

export async function addAdminEmail(email: string): Promise<void> {
  const id = normEmail(email);
  if (!id.includes("@")) throw new Error("Enter a valid email");
  await upsert(COL, id, { email: id });
}

export function listenAdmins(cb: (emails: string[]) => void): () => void {
  void ensureSeedAdmin();
  return listen<AdminRow>(COL, (rows) => {
    const set = new Set([SEED_ADMIN, ...rows.map((r) => normEmail(r.email))]);
    cb([...set]);
  });
}
