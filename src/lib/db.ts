"use client";

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { getDb, firebaseEnabled } from "@/lib/firebase";

type Row = Record<string, unknown> & { id: string };
type Listener = () => void;

const memory: Record<string, Record<string, Row>> = {};
const listeners = new Map<string, Set<Listener>>();
const LS_KEY = "aasra-ops-v1";

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
  const fs = getDb();
  if (fs) {
    await setDoc(doc(fs, col, id), row, { merge: true });
  }
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
      const next: Record<string, Row> = {};
      snap.forEach((d) => {
        next[d.id] = { ...(d.data() as DocumentData), id: d.id } as Row;
      });
      memory[col] = next;
      listeners.get(col)?.forEach((fn) => fn());
    });
  }

  return () => {
    listeners.get(col)?.delete(run);
    unsubFs?.();
  };
}

export function nid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}
