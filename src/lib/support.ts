"use client";

import { collection, getDocs } from "firebase/firestore";
import { getAll, getById, hydrateLocal, listen, upsert } from "@/lib/db";
import { getDb } from "@/lib/firebase";
import type { ApprovedSupport, Incident, IncidentHelper, SupportApplication } from "@/lib/types";

export function listApprovedSupport(): string[] {
  hydrateLocal();
  return getAll<ApprovedSupport>("approvedSupport").map((r) => r.email.toLowerCase());
}

export function getApprovedProfile(email: string | null | undefined): ApprovedSupport | undefined {
  if (!email) return undefined;
  return getById<ApprovedSupport>("approvedSupport", email.trim().toLowerCase());
}

export async function checkApprovedSupport(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const id = email.trim().toLowerCase();
  if (listApprovedSupport().includes(id)) return true;
  const fs = getDb();
  if (!fs) return false;
  const snap = await getDocs(collection(fs, "approvedSupport"));
  return snap.docs.some((d) => d.id === id || String(d.data().email || "").toLowerCase() === id);
}

export function isApprovedSupport(email: string | null | undefined): boolean {
  if (!email) return false;
  return listApprovedSupport().includes(email.trim().toLowerCase());
}

export async function approveSupport(row: SupportApplication): Promise<void> {
  const id = row.email.trim().toLowerCase();
  await upsert("approvedSupport", id, {
    email: id,
    kind: row.kind,
    name: row.name,
    orgName: row.orgName || row.department || row.name,
    areaLabel: row.areaLabel,
    lat: row.lat,
    lng: row.lng,
  });
}

export async function claimIncidentHelp(incident: Incident, helper: IncidentHelper, claimNote?: string): Promise<Incident> {
  hydrateLocal();
  const current = getById<Incident>("incidents", incident.id) ?? incident;
  if (current.helper) return current;
  const next: Incident = {
    ...current,
    helper,
    status: "assigned",
    updatedAt: Date.now(),
    claimNote: claimNote || current.claimNote,
  };
  await upsert("incidents", incident.id, next);
  return next;
}

export function listenApplications(cb: (rows: SupportApplication[]) => void): () => void {
  return listen<SupportApplication>("applications", (rows) =>
    cb(rows.sort((a, b) => b.createdAt - a.createdAt)),
  );
}

export function listenApprovedSupport(cb: (rows: ApprovedSupport[]) => void): () => void {
  return listen<ApprovedSupport>("approvedSupport", cb);
}
