"use client";

import { IntakeAgent } from "@/lib/agents/intake";
import { VerificationAgent } from "@/lib/agents/verification";
import { PrioritizationAgent } from "@/lib/agents/prioritization";
import { RoutingAgent } from "@/lib/agents/routing";
import { SummaryAgent } from "@/lib/agents/summary";
import { getAll, hydrateLocal, nid, upsert } from "@/lib/db";
import { SEED_RESOURCES } from "@/lib/seed";
import { FEED_SCRIPT, toInbox } from "@/lib/sim/messages";
import type {
  AgentLog,
  Assignment,
  Hazard,
  Incident,
  InboxMessage,
  ResourceAsset,
  Sitrep,
  StructuredEvent,
} from "@/lib/types";

let started = false;
let tick = 0;

async function log(agent: AgentLog["agent"], message: string, refId?: string) {
  const row: AgentLog = { id: nid("LOG"), agent, at: Date.now(), message, refId };
  await upsert("agentLogs", row.id, row);
}

export async function ingestMessage(msg: InboxMessage) {
  await upsert("inbox", msg.id, msg);
  const parsed = IntakeAgent.run(msg);
  await log("intake", `Structured ${parsed.type} @ ${parsed.locationId} · ${parsed.resource}`, parsed.id);

  const corpus = getAll<StructuredEvent>("events");
  const v = VerificationAgent.run({ incoming: parsed, corpus });
  const event: StructuredEvent = {
    ...parsed,
    verification: v.verification,
    corroboration: v.corroboration,
    stage: "verified",
  };
  await upsert("events", event.id, event);
  await log("verification", `${v.verification} (${v.corroboration} sources) ${event.subjectKey}`, event.id);

  if (event.type === "hazard_report" && event.hazardStatus && event.hazardStatus !== "unknown") {
    const roadId = event.subjectKey.startsWith("road:") ? event.subjectKey.slice(5) : event.locationId;
    const hazard: Hazard = {
      id: `HZ-${roadId}`,
      roadId,
      label: event.locationLabel,
      status: event.hazardStatus,
      verification: event.verification,
      updatedAt: Date.now(),
      sourceEventId: event.id,
    };
    await upsert("hazards", hazard.id, hazard);
  }

  const incidents = PrioritizationAgent.run(getAll<StructuredEvent>("events"), getAll<Incident>("incidents"));
  for (const inc of incidents) {
    await upsert("incidents", inc.id, inc);
  }
  await log("prioritization", `Queue ${incidents.length} · top ${incidents[0]?.title ?? "—"}`);

  const routed = RoutingAgent.run({
    incidents: getAll<Incident>("incidents"),
    resources: getAll<ResourceAsset>("resources"),
    assignments: getAll<Assignment>("assignments"),
    hazards: getAll<Hazard>("hazards"),
  });
  for (const r of routed.resources) await upsert("resources", r.id, r);
  for (const a of routed.assignments) await upsert("assignments", a.id, a);
  for (const inc of getAll<Incident>("incidents")) await upsert("incidents", inc.id, inc);
  for (const n of routed.notes) await log("routing", n);

  for (const ev of getAll<StructuredEvent>("events")) {
    const inc = getAll<Incident>("incidents").find((i) => i.eventId === ev.id || i.id === `INC-${ev.subjectKey}`);
    const asn = getAll<Assignment>("assignments").find((a) => a.incidentId === inc?.id && a.status === "active");
    const stage: StructuredEvent["stage"] = asn ? "assigned" : inc ? "prioritized" : "verified";
    await upsert("events", ev.id, { ...ev, stage, incidentId: inc?.id, assignmentId: asn?.id });
  }

  tick += 1;
  const sitrep = SummaryAgent.run({
    incidents: getAll<Incident>("incidents"),
    events: getAll<StructuredEvent>("events"),
    resources: getAll<ResourceAsset>("resources"),
    assignments: getAll<Assignment>("assignments"),
    hazards: getAll<Hazard>("hazards"),
    tick,
  });
  await upsert("sitrep", "current", sitrep);
  await log("summary", sitrep.headline);
}

export async function ensureSeeded() {
  hydrateLocal();
  if (getAll<ResourceAsset>("resources").length) return;
  for (const r of SEED_RESOURCES) await upsert("resources", r.id, r);
  const empty: Sitrep = {
    id: "current",
    generatedAt: Date.now(),
    activeIncidents: 0,
    critical: 0,
    high: 0,
    roadsBlocked: 0,
    freeUnits: SEED_RESOURCES.length,
    assignedUnits: 0,
    headline: "Sector quiet — feed not started",
    predictions: [],
    tick: 0,
  };
  await upsert("sitrep", "current", empty);
}

export function startLiveFeed() {
  if (started || typeof window === "undefined") return;
  started = true;
  const t0 = Date.now();
  void ensureSeeded().then(() => {
    for (const row of FEED_SCRIPT) {
      window.setTimeout(() => {
        void ingestMessage(toInbox(row, Date.now()));
      }, row.delayMs);
    }
  });
  return t0;
}

export function resetSession() {
  started = false;
  if (typeof window !== "undefined") localStorage.removeItem("aasra-ops-v1");
  window.location.reload();
}
