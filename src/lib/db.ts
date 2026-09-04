"use client";

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { getDb, firebaseEnabled } from "@/lib/firebase";
import type { AgentLog, ApprovedSupport, Incident, InboxMessage, StructuredEvent, SupportApplication } from "@/lib/types";
import { rankNearestSupport } from "@/lib/nearest";

type Row = Record<string, unknown> & { id: string };
type Listener = () => void;
export type PublicTicket = {
  inbox: InboxMessage;
  event: StructuredEvent;
  incident: Incident;
  log: AgentLog;
};

const memory: Record<string, Record<string, Row>> = {};
const listeners = new Map<string, Set<Listener>>();
const LS_KEY = "aasra-ops-v1";
const BUS_NAME = "aasra-ticket";

let channel: BroadcastChannel | null | undefined;

function getBus(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (channel === undefined) {
    try {
      channel = new BroadcastChannel(BUS_NAME);
      channel.addEventListener("message", (ev: MessageEvent<PublicTicket | SupportApplication>) => {
        const data = ev.data;
        if (data && "incident" in data && data.incident?.id) applyPublicTicket(data as PublicTicket, false);
        if (data && "kind" in data && "email" in data && data.id) applyApplication(data as SupportApplication, false);
      });
      window.addEventListener("storage", (e) => {
        if (e.key !== LS_KEY || !e.newValue) return;
        hydrateLocal();
        listeners.forEach((set) => set.forEach((fn) => fn()));
      });
    } catch {
      channel = null;
    }
  }
  return channel ?? null;
}

function bucket(col: string): Record<string, Row> {
  if (!memory[col]) memory[col] = {};
  return memory[col];
}

function emit(col: string) {
  listeners.get(col)?.forEach((fn) => fn());
  persist();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(memory));
  } catch {
    /* quota */
  }
}

function pushFs(col: string, id: string, row: Row) {
  const fs = getDb();
  if (!fs) return;
  void setDoc(doc(fs, col, id), row, { merge: true }).catch(() => {
    /* rules / offline */
  });
}

export function hydrateLocal(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Record<string, Row>>;
    Object.assign(memory, parsed);
  } catch {
    /* ignore */
  }
}

export function clearAll(): void {
  for (const key of Object.keys(memory)) delete memory[key];
  if (typeof window !== "undefined") localStorage.removeItem(LS_KEY);
  listeners.forEach((set) => set.forEach((fn) => fn()));
}

export async function upsert(col: string, id: string, data: Record<string, unknown>): Promise<void> {
  const row = { ...bucket(col)[id], ...data, id } as Row;
  bucket(col)[id] = row;
  emit(col);
  pushFs(col, id, row);
}

export function applyApplication(row: SupportApplication, relay = true): void {
  hydrateLocal();
  const stored: SupportApplication =
    (row.photoDataUrl?.length ?? 0) > 700000 ? { ...row, photoDataUrl: undefined } : row;
  bucket("applications")[row.id] = stored as unknown as Row;
  emit("applications");
  pushFs("applications", row.id, stored as unknown as Row);
  if (relay) {
    try {
      getBus()?.postMessage(row);
    } catch {
      /* ignore */
    }
  }
}

export function applyPublicTicket(ticket: PublicTicket, relay = true): void {
  hydrateLocal();
  if (typeof ticket.incident.lat === "number" && typeof ticket.incident.lng === "number") {
    ticket.incident.nearest = rankNearestSupport(
      getAll<ApprovedSupport>("approvedSupport"),
      ticket.incident.lat,
      ticket.incident.lng,
    );
  }
  bucket("inbox")[ticket.inbox.id] = ticket.inbox as unknown as Row;
  bucket("events")[ticket.event.id] = ticket.event as unknown as Row;
  bucket("incidents")[ticket.incident.id] = ticket.incident as unknown as Row;
  bucket("agentLogs")[ticket.log.id] = ticket.log as unknown as Row;
  emit("inbox");
  emit("events");
  emit("incidents");
  emit("agentLogs");
  pushFs("inbox", ticket.inbox.id, ticket.inbox as unknown as Row);
  pushFs("events", ticket.event.id, ticket.event as unknown as Row);
  pushFs("incidents", ticket.incident.id, ticket.incident as unknown as Row);
  pushFs("agentLogs", ticket.log.id, ticket.log as unknown as Row);
  if (relay) {
    try {
      getBus()?.postMessage(ticket);
    } catch {
      /* ignore */
    }
  }
}

export function mergeCloud(col: string, data: Record<string, unknown> & { id: string }): void {
  hydrateLocal();
  const id = data.id;
  bucket(col)[id] = { ...bucket(col)[id], ...data, id } as Row;
  emit(col);
}

export function getAll<T extends { id: string }>(col: string): T[] {
  return Object.values(bucket(col)) as T[];
}

export function getById<T extends { id: string }>(col: string, id: string): T | undefined {
  return bucket(col)[id] as T | undefined;
}

export function listen<T extends { id: string }>(col: string, cb: (rows: T[]) => void): () => void {
  hydrateLocal();
  const run = () => cb(getAll<T>(col));
  if (!listeners.has(col)) listeners.set(col, new Set());
  listeners.get(col)!.add(run);
  run();

  const fs = getDb();
  let unsubFs: (() => void) | undefined;
  if (fs && firebaseEnabled()) {
    unsubFs = onSnapshot(collection(fs, col), (snap) => {
      snap.forEach((d) => {
        bucket(col)[d.id] = { ...(d.data() as DocumentData), id: d.id } as Row;
      });
      listeners.get(col)?.forEach((fn) => fn());
    });
  }

  getBus();

  return () => {
    listeners.get(col)?.delete(run);
    unsubFs?.();
  };
}

export async function syncFromFirestore(): Promise<void> {
  if (typeof window === "undefined") return;
  const rest = await import("@/lib/firestoreRest");
  const cols = ["incidents", "events", "inbox", "agentLogs", "sitrep", "hazards", "assignments"] as const;
  for (const col of cols) {
    const rows = await rest.listFirestoreCol(col);
    if (!rows.length) continue;
    hydrateLocal();
    for (const row of rows) {
      const id = String(row.id ?? "");
      if (!id) continue;
      bucket(col)[id] = { ...row, id } as Row;
    }
    emit(col);
  }
  persist();
}

export function nid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}
