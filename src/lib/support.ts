"use client";

import { doc, getDoc } from "firebase/firestore";
import { getAll, getById, hydrateLocal, listen, upsert } from "@/lib/db";
import { getDb } from "@/lib/firebase";
import { parseSupportKind } from "@/lib/supportKind";
import type { ApprovedSupport, Incident, IncidentHelper, SupportApplication } from "@/lib/types";

export function listApprovedSupport(): string[] {
  hydrateLocal();
  return getAll<ApprovedSupport>("approvedSupport").map((r) => r.email.toLowerCase());
}

export function getApprovedProfile(email: string | null | undefined): ApprovedSupport | undefined {
  if (!email) return undefined;
  const id = email.trim().toLowerCase();
  return getById<ApprovedSupport>("approvedSupport", id);
}

function normalizeProfile(id: string, data: Record<string, unknown>): ApprovedSupport {
  return {
    id,
    email: String(data.email ?? id).toLowerCase(),
    kind: parseSupportKind(data.kind),
    name: typeof data.name === "string" ? data.name : undefined,
    orgName: typeof data.orgName === "string" ? data.orgName : undefined,
    areaLabel: typeof data.areaLabel === "string" ? data.areaLabel : undefined,
    lat: typeof data.lat === "number" ? data.lat : undefined,
    lng: typeof data.lng === "number" ? data.lng : undefined,
  };
}

export async function loadApprovedSupport(email: string | null | undefined): Promise<ApprovedSupport | null> {
  if (!email) return null;
  const id = email.trim().toLowerCase();
  hydrateLocal();
  const local = getById<ApprovedSupport>("approvedSupport", id);
  if (local) return { ...local, kind: parseSupportKind(local.kind), email: id };
  const fs = getDb();
  if (!fs) return null;
  const snap = await getDoc(doc(fs, "approvedSupport", id));
  if (!snap.exists()) return null;
  const profile = normalizeProfile(id, snap.data() as Record<string, unknown>);
  await upsert("approvedSupport", id, profile);
  return profile;
}

export async function checkApprovedSupport(email: string | null | undefined): Promise<boolean> {
  return Boolean(await loadApprovedSupport(email));
}

export function isApprovedSupport(email: string | null | undefined): boolean {
  if (!email) return false;
  return listApprovedSupport().includes(email.trim().toLowerCase());
}

export async function approveSupport(row: SupportApplication): Promise<void> {
  const id = row.email.trim().toLowerCase();
  await upsert("approvedSupport", id, {
    email: id,
    kind: parseSupportKind(row.kind),
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