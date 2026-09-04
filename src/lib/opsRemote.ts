"use client";

import type { VerifyClerkAsk } from "@/lib/agents/verification";
import { getAll, nid, upsert } from "@/lib/db";
import type { Assignment, Hazard, Incident, InfraAsset, ResourceAsset, Sitrep, VerificationTag } from "@/lib/types";

export function opsSnapshot() {
  return {
    incidents: getAll<Incident>("incidents"),
    resources: getAll<ResourceAsset>("resources"),
    assignments: getAll<Assignment>("assignments"),
    hazards: getAll<Hazard>("hazards"),
  };
}

async function persistOps(data: {
  incidents?: Incident[];
  resources?: ResourceAsset[];
  assignments?: Assignment[];
  notes?: string[];
}) {
  for (const r of data.resources ?? []) await upsert("resources", r.id, r);
  for (const a of data.assignments ?? []) await upsert("assignments", a.id, a);
  for (const i of data.incidents ?? []) await upsert("incidents", i.id, i);
  for (const n of data.notes ?? []) {
    await upsert("agentLogs", nid("LOG"), {
      id: nid("LOG"),
      agent: "routing",
      at: Date.now(),
      message: n,
    });
  }
}

export async function requestPrioritize() {
  if (typeof window === "undefined") return { ok: false as const, studied: false };
  const incidents = getAll<Incident>("incidents");
  const res = await fetch("/api/prioritize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incidents }),
  });
  const data = (await res.json()) as { ok?: boolean; incidents?: Incident[]; studied?: boolean };
  if (!res.ok || !data.ok) return { ok: false as const, studied: false };
  for (const i of data.incidents ?? []) await upsert("incidents", i.id, i);
  return { ok: true as const, studied: Boolean(data.studied) };
}

export async function requestAssign(incidentId?: string) {
  if (typeof window === "undefined") return { ok: false as const, studied: false };
  const snap = opsSnapshot();
  const res = await fetch("/api/assign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...snap, incidentId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    notes?: string[];
    incidents?: Incident[];
    resources?: ResourceAsset[];
    assignments?: Assignment[];
    studied?: boolean;
  };
  if (!res.ok || !data.ok) return { ok: false as const, studied: false };
  await persistOps(data);
  return { ok: true as const, studied: Boolean(data.studied) };
}

let rerouteInFlight: Promise<{
  ok: boolean;
  headline: string;
  alternatives?: string[];
  studied?: boolean;
}> | null = null;

export async function requestReroute(road?: string) {
  if (typeof window === "undefined") return { ok: false as const, headline: "" };
  if (rerouteInFlight) return rerouteInFlight;
  const run = (async () => {
    const snap = opsSnapshot();
    const res = await fetch("/api/reroute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...snap, road }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      headline?: string;
      notes?: string[];
      alternatives?: string[];
      incidents?: Incident[];
      resources?: ResourceAsset[];
      assignments?: Assignment[];
      studied?: boolean;
    };
    if (!res.ok || !data.ok) return { ok: false as const, headline: data.headline ?? "" };
    await persistOps(data);
    return {
      ok: true as const,
      headline: data.headline ?? "",
      alternatives: data.alternatives ?? [],
      studied: data.studied,
    };
  })().finally(() => {
    rerouteInFlight = null;
  });
  rerouteInFlight = run;
  return run;
}

export async function requestVerify(ask: VerifyClerkAsk) {
  if (typeof window === "undefined") {
    return { ok: false as const, verification: ask.heuristic, ids: [ask.incoming.id] as string[] };
  }
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ask),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    studied?: boolean;
    verification?: VerificationTag;
    reason?: string;
    ids?: string[];
  };
  if (!res.ok || !data.ok || !data.verification) {
    return { ok: false as const, verification: ask.heuristic, ids: [ask.incoming.id] };
  }
  return {
    ok: true as const,
    studied: Boolean(data.studied),
    verification: data.verification,
    reason: data.reason ?? "",
    ids: data.ids?.length ? data.ids : [ask.incoming.id],
  };
}

export async function requestSitrep(tick = 0) {
  if (typeof window === "undefined") return { ok: false as const };
  const snap = opsSnapshot();
  const res = await fetch("/api/sitrep", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...snap, tick }),
  });
  const data = (await res.json()) as { ok?: boolean; sitrep?: Sitrep; studied?: boolean };
  if (!res.ok || !data.ok || !data.sitrep) return { ok: false as const };
  await upsert("sitrep", "current", data.sitrep);
  await upsert("agentLogs", nid("LOG"), {
    id: nid("LOG"),
    agent: "summary",
    at: Date.now(),
    message: data.sitrep.headline,
  });
  return { ok: true as const, studied: data.studied, sitrep: data.sitrep };
}

export async function requestRepairs() {
  if (typeof window === "undefined") return { ok: false as const };
  const assets = getAll<InfraAsset>("infra");
  const hazards = getAll<Hazard>("hazards");
  const res = await fetch("/api/repair-priority", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assets, hazards }),
  });
  const data = (await res.json()) as { ok?: boolean; repairs?: InfraAsset[]; studied?: boolean; model?: string };
  if (!res.ok || !data.ok || !data.repairs) return { ok: false as const };
  for (const row of data.repairs) await upsert("infra", row.id, row);
  return { ok: true as const, studied: data.studied, model: data.model };
}
