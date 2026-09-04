"use client";

import { IntakeAgent } from "@/lib/agents/intake";
import { stampIds, VerificationAgent } from "@/lib/agents/verification";
import { PrioritizationAgent } from "@/lib/agents/prioritization";
import { RoutingAgent } from "@/lib/agents/routing";
import { SummaryAgent } from "@/lib/agents/summary";
import { getAll, hydrateLocal, nid, upsert, clearAll } from "@/lib/db";
import { requestAssign, requestPrioritize, requestRepairs, requestReroute, requestSitrep, requestVerify } from "@/lib/opsRemote";
import { SEED_INFRA, SEED_RESOURCES } from "@/lib/seed";
import { DRIP_POOL, FEED_SCRIPT, toInbox } from "@/lib/sim/messages";
import type {
  AgentLog,
  Assignment,
  Hazard,
  Incident,
  InboxMessage,
  InfraAsset,
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
  const parsed = await IntakeAgent.runAsync(msg);
  await log("intake", `Structured ${parsed.type} @ ${parsed.locationId} · ${parsed.resource}`, parsed.id);

  const corpus = getAll<StructuredEvent>("events");
  const { heuristic, clerk } = VerificationAgent.ask({ incoming: parsed, corpus });
  const event: StructuredEvent = {
    ...parsed,
    verification: heuristic.verification,
    corroboration: heuristic.corroboration,
    stage: "verified",
  };
  await upsert("events", event.id, event);
  if (heuristic.verification === "conflicting") {
    for (const id of stampIds(event.id, clerk.peers, "conflicting", parsed.hazardStatus)) {
      if (id === event.id) continue;
      const row = getAll<StructuredEvent>("events").find((e) => e.id === id);
      if (row) await upsert("events", id, { ...row, verification: "conflicting" });
    }
  }
  await log(
    "verification",
    `${heuristic.verification} (${heuristic.corroboration} sources) ${event.subjectKey}`,
    event.id,
  );
  void requestVerify(clerk).then(async (hit) => {
    if (!hit.ok || (hit.verification === heuristic.verification && !hit.studied)) return;
    const tag = hit.verification;
    VerificationAgent.accept(event.id, tag, heuristic.corroboration, hit.reason);
    for (const id of hit.ids) {
      const row = getAll<StructuredEvent>("events").find((e) => e.id === id);
      if (!row) continue;
      await upsert("events", id, { ...row, verification: tag });
    }
    for (const inc of getAll<Incident>("incidents")) {
      if (hit.ids.includes(inc.eventId) || inc.id === `INC-${event.subjectKey}`) {
        await upsert("incidents", inc.id, { ...inc, verification: tag, updatedAt: Date.now() });
      }
    }
    for (const hz of getAll<Hazard>("hazards")) {
      if (hz.sourceEventId && hit.ids.includes(hz.sourceEventId)) {
        await upsert("hazards", hz.id, { ...hz, verification: tag, updatedAt: Date.now() });
      }
    }
    await log(
      "verification",
      `${hit.studied ? "clerk" : "desk"} ${tag} · ${hit.reason || event.subjectKey}`,
      event.id,
    );
  });

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
  for (const inc of routed.incidents) await upsert("incidents", inc.id, inc);
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
  scheduleSitrep();

  if (event.type === "hazard_report") {
    void requestReroute(event.locationLabel).then(() => void requestRepairs());
  } else if (event.type === "request") {
    scheduleClerkAssign();
  }
}

export async function ensureSeeded() {
  hydrateLocal();
  if (!getAll<ResourceAsset>("resources").length) {
    for (const r of SEED_RESOURCES) await upsert("resources", r.id, r);
  }
  if (!getAll<InfraAsset>("infra").length) {
    for (const row of SEED_INFRA) await upsert("infra", row.id, row);
  }
  if (getAll<Sitrep>("sitrep").length) return;
  const empty: Sitrep = {
    id: "current",
    generatedAt: Date.now(),
    activeIncidents: 0,
    critical: 0,
    high: 0,
    roadsBlocked: 0,
    freeUnits: SEED_RESOURCES.length,
    assignedUnits: 0,
    sheltersNearCapacity: 0,
    predictedShortage: "",
    headline: "Sector quiet — feed not started",
    predictions: [],
    tick: 0,
  };
  await upsert("sitrep", "current", empty);
}

export function startLiveFeed() {
  if (started || typeof window === "undefined") return;
  started = true;
  void ensureSeeded().then(() => {
    const already = getAll<InboxMessage>("inbox").length > 0;
    if (!already) {
      for (const row of FEED_SCRIPT) {
        window.setTimeout(() => {
          void ingestMessage(toInbox(row, Date.now()));
        }, row.delayMs);
      }
    }
    window.setTimeout(
      () => {
        window.setInterval(() => {
          const row = DRIP_POOL[Math.floor(Math.random() * DRIP_POOL.length)]!;
          void ingestMessage(toInbox(row, Date.now()));
        }, 8000);
      },
      already ? 2000 : 65000,
    );
  });
}

export async function injectRoadBlock(road = "NH-16") {
  await ingestMessage({
    id: nid("IN"),
    rawText: `${road} corridor blocked at Autonagar underpass, trucks cannot pass`,
    source: "Duty officer inject",
    timestamp: Date.now(),
    processed: false,
  });
  return requestReroute(road);
}

export function resetSession() {
  started = false;
  tick = 0;
  if (typeof window !== "undefined") {
    window.clearTimeout(assignTimer);
    window.clearTimeout(sitrepTimer);
    clearAll();
    window.location.reload();
  }
}

let assignTimer: number | undefined;
function scheduleClerkAssign() {
  if (typeof window === "undefined") return;
  window.clearTimeout(assignTimer);
  assignTimer = window.setTimeout(() => {
    void requestPrioritize().then(() => void requestAssign());
  }, 1400);
}

let sitrepTimer: number | undefined;
function scheduleSitrep() {
  if (typeof window === "undefined") return;
  window.clearTimeout(sitrepTimer);
  sitrepTimer = window.setTimeout(() => {
    void requestSitrep(tick);
  }, 2800);
}
