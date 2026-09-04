import { DEFAULT_POLICY, scoreNeed } from "@/lib/policy";
import type { Incident, StructuredEvent } from "@/lib/types";

export type RankedIncident = Incident;

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
      const penalty = e.verification === "conflicting" ? 25 : e.verification === "uncertain" ? 8 : 0;
      const priorityScore = scoreNeed(DEFAULT_POLICY, {
        resource: e.resource,
        raw: e.translated,
        quantity: e.quantity,
        urgencySignal: e.urgencySignal,
        verificationPenalty: penalty,
      });
      const severity: Incident["severity"] =
        priorityScore >= 140 ? "critical" : priorityScore >= 95 ? "high" : "normal";
      return {
        id: `INC-${e.subjectKey}`,
        eventId: e.id,
        type: e.type,
        title: `${e.quantity} ${e.resource} · ${e.locationLabel}`,
        locationId: e.locationId,
        locationLabel: e.locationLabel,
        resource: e.resource,
        quantity: e.quantity,
        severity,
        priorityScore,
        rank: 0,
        verification: e.verification,
        status: prev?.status === "rerouted" ? "rerouted" : prev?.status ?? "open",
        createdAt: prev?.createdAt ?? e.timestamp,
        updatedAt: Date.now(),
      };
    });

    scored.sort((a, b) => b.priorityScore - a.priorityScore);
    scored.forEach((inc, idx) => {
      inc.rank = idx + 1;
    });
    this.memory.lastOrder = scored.map((s) => s.id);
    return scored;
  },
};
