import {
  DEFAULT_POLICY,
  categoryFor,
  categoryRank,
  clampPriorityScore,
  explainNeed,
  scoreNeed,
  severityFromScore,
} from "@/lib/policy";
import type { Incident, Severity, StructuredEvent } from "@/lib/types";

export type RankedIncident = Incident;

export type PriorityOverride = {
  id: string;
  priorityScore: number;
  severity?: Severity;
  why?: string;
};

function verificationPenalty(tag: StructuredEvent["verification"]): number {
  if (tag === "conflicting") return 20;
  if (tag === "uncertain") return 6;
  return 0;
}

function aiLocked(prev?: Incident): boolean {
  return prev?.scoreSource === "ai" || Boolean(prev?.reason);
}

export function applyPriorityOverrides(incidents: Incident[], overrides: PriorityOverride[]): Incident[] {
  const map = new Map(overrides.map((o) => [o.id, o]));
  const next = incidents.map((i) => {
    const o = map.get(i.id);
    if (!o) return i;
    return {
      ...i,
      heuristicScore: i.heuristicScore ?? i.priorityScore,
      priorityScore: clampPriorityScore(o.priorityScore),
      severity: o.severity ?? i.severity,
      priorityWhy: o.why?.trim() || i.priorityWhy,
      scoreSource: "ai" as const,
      updatedAt: Date.now(),
    };
  });
  next.sort(
    (a, b) =>
      b.priorityScore - a.priorityScore ||
      categoryRank(categoryFor(b.resource, b.title)) - categoryRank(categoryFor(a.resource, a.title)),
  );
  next.forEach((inc, idx) => {
    inc.rank = idx + 1;
  });
  return next;
}

export const PrioritizationAgent = {
  name: "prioritization" as const,
  memory: { lastOrder: [] as string[] },
  run(events: StructuredEvent[], existing: Incident[]): Incident[] {
    const requests = events.filter((e) => e.type === "request");
    const bySubject = new Map<string, StructuredEvent>();
    for (const e of requests) {
      const prev = bySubject.get(e.subjectKey);
      if (!prev || e.timestamp > prev.timestamp) bySubject.set(e.subjectKey, e);
    }

    const scored: Incident[] = [...bySubject.values()].map((e) => {
      const prev = existing.find((i) => i.id === `INC-${e.subjectKey}`);
      const heuristicScore = scoreNeed(DEFAULT_POLICY, {
        resource: e.resource,
        raw: e.translated,
        quantity: e.quantity,
        urgencySignal: e.urgencySignal,
        verificationPenalty: verificationPenalty(e.verification),
      });
      const heuristicSeverity = severityFromScore(heuristicScore, e.urgencySignal, e.resource, e.translated);
      const why = explainNeed(e.resource, e.translated, e.quantity);
      const locked = aiLocked(prev);
      return {
        id: `INC-${e.subjectKey}`,
        eventId: e.id,
        type: e.type,
        title: prev?.reason ? prev.title : `${e.quantity} ${e.resource} · ${e.locationLabel}`,
        locationId: e.locationId,
        locationLabel: e.locationLabel,
        resource: prev?.reason ? prev.resource : e.resource,
        quantity: e.quantity,
        severity: locked ? prev!.severity : heuristicSeverity,
        priorityScore: locked ? prev!.priorityScore : heuristicScore,
        heuristicScore,
        rank: 0,
        priorityWhy: locked ? prev!.priorityWhy || why : why,
        scoreSource: locked ? "ai" : "heuristic",
        verification: e.verification,
        status: prev?.status === "rerouted" ? "rerouted" : prev?.status ?? "open",
        createdAt: prev?.createdAt ?? e.timestamp,
        updatedAt: Date.now(),
        reason: prev?.reason,
        lat: prev?.lat,
        lng: prev?.lng,
        helper: prev?.helper,
        nearest: prev?.nearest,
        aiPick: prev?.aiPick,
        claimNote: prev?.claimNote,
      };
    });

    scored.sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        categoryRank(categoryFor(b.resource, b.title)) - categoryRank(categoryFor(a.resource, a.title)),
    );
    scored.forEach((inc, idx) => {
      inc.rank = idx + 1;
    });
    this.memory.lastOrder = scored.map((s) => s.id);
    return scored;
  },
};
