"use client";

import { useEffect, useState } from "react";
import { listen, mergeCloud } from "@/lib/db";
import type { AgentLog, Assignment, Hazard, Incident, InboxMessage, InfraAsset, ResourceAsset, Sitrep, StructuredEvent } from "@/lib/types";

export function useOps() {
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [events, setEvents] = useState<StructuredEvent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<ResourceAsset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [sitrep, setSitrep] = useState<Sitrep | null>(null);
  const [infra, setInfra] = useState<InfraAsset[]>([]);

  useEffect(() => {
    const u: Array<() => void> = [
      listen("inbox", setInbox),
      listen("events", setEvents),
      listen("incidents", setIncidents),
      listen("resources", setResources),
      listen("assignments", setAssignments),
      listen("hazards", setHazards),
      listen("agentLogs", setLogs),
      listen<Sitrep>("sitrep", (rows) => setSitrep(rows.find((r) => r.id === "current") ?? null)),
      listen("infra", setInfra),
    ];
    let live = true;
    const pull = () => {
      void fetch("/api/ops-pull", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: { ok?: boolean; incidents?: Array<Record<string, unknown> & { id: string }>; events?: Array<Record<string, unknown> & { id: string }>; inbox?: Array<Record<string, unknown> & { id: string }> }) => {
          if (!live || !data.ok) return;
          for (const row of data.incidents ?? []) if (row.id) mergeCloud("incidents", row);
          for (const row of data.events ?? []) if (row.id) mergeCloud("events", row);
          for (const row of data.inbox ?? []) if (row.id) mergeCloud("inbox", row);
        })
        .catch(() => undefined);
    };
    pull();
    const id = window.setInterval(pull, 8000);
    return () => {
      live = false;
      window.clearInterval(id);
      u.forEach((fn) => fn());
    };
  }, []);

  return {
    inbox: [...inbox].sort((a, b) => b.timestamp - a.timestamp),
    events: [...events].sort((a, b) => b.timestamp - a.timestamp),
    incidents: [...incidents]
      .filter((i) => i.status !== "resolved")
      .sort((a, b) => b.priorityScore - a.priorityScore || b.createdAt - a.createdAt)
      .map((i, idx) => ({ ...i, rank: idx + 1 })),
    resources,
    assignments: [...assignments].sort((a, b) => b.updatedAt - a.updatedAt),
    hazards,
    logs: [...logs].sort((a, b) => b.at - a.at).slice(0, 40),
    sitrep,
    infra: [...infra].sort((a, b) => (b.score || 0) - (a.score || 0) || a.rank - b.rank),
  };
}
