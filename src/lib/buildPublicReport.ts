import { IntakeAgent } from "@/lib/agents/intake";
import { VerificationAgent } from "@/lib/agents/verification";
import { DEFAULT_POLICY, explainNeed, scoreNeed, severityFromScore } from "@/lib/policy";
import { nid } from "@/lib/ids";
import type { AgentLog, Incident, InboxMessage, StructuredEvent } from "@/lib/types";

export type PublicReportInput = {
  location: string;
  need: string;
  name?: string;
  lat?: number;
  lng?: number;
};

export async function buildPublicReport(input: PublicReportInput): Promise<{
  inbox: InboxMessage;
  event: StructuredEvent;
  incident: Incident;
  log: AgentLog;
}> {
  const loc = input.location.trim();
  const need = input.need.trim();
  const pin =
    input.lat != null && input.lng != null ? ` [${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}]` : "";
  const who = input.name?.trim();
  const inbox: InboxMessage = {
    id: nid("IN"),
    rawText: `need help at ${loc}${pin}: ${need}`,
    source: who ? `Public report · ${who}` : "Public report",
    timestamp: Date.now(),
    processed: true,
  };
  const parsed = await IntakeAgent.runAsync(inbox);
  const v = VerificationAgent.run({ incoming: parsed, corpus: [] });
  const event: StructuredEvent = {
    ...parsed,
    verification: v.verification,
    corroboration: v.corroboration,
    stage: "prioritized",
    incidentId: `INC-${inbox.id}`,
  };
  const penalty = event.verification === "uncertain" ? 6 : event.verification === "conflicting" ? 20 : 0;
  const priorityScore = scoreNeed(DEFAULT_POLICY, {
    resource: event.resource,
    raw: event.translated,
    quantity: event.quantity,
    urgencySignal: event.urgencySignal,
    verificationPenalty: penalty,
  });
  const severity = severityFromScore(priorityScore, event.urgencySignal, event.resource, event.translated);
  const incident: Incident = {
    id: `INC-${inbox.id}`,
    eventId: event.id,
    type: event.type,
    title: `${event.quantity} ${event.resource} · ${event.locationLabel}`,
    locationId: event.locationId,
    locationLabel: event.locationLabel,
    resource: event.resource,
    quantity: event.quantity,
    severity,
    priorityScore,
    heuristicScore: priorityScore,
    rank: 0,
    priorityWhy: explainNeed(event.resource, event.translated, event.quantity),
    scoreSource: "heuristic",
    verification: event.verification,
    status: "open",
    createdAt: inbox.timestamp,
    updatedAt: inbox.timestamp,
    lat: input.lat,
    lng: input.lng,
  };
  const log: AgentLog = {
    id: nid("LOG"),
    agent: "intake",
    at: inbox.timestamp,
    message: `Public report @ ${event.locationLabel} · ${event.resource}`,
    refId: event.id,
  };
  return { inbox, event, incident, log };
}
