"use client";

import { useEffect, useState } from "react";
import { listen } from "@/lib/db";
import type { AgentLog, Assignment, Hazard, Incident, InboxMessage, ResourceAsset, Sitrep, StructuredEvent } from "@/lib/types";

export function useOps() {
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [events, setEvents] = useState<StructuredEvent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<ResourceAsset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [sitrep, setSitrep] = useState<Sitrep | null>(null);

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
    ];
    return () => u.forEach((fn) => fn());
  }, []);

  return {
    inbox: [...inbox].sort((a, b) => b.timestamp - a.timestamp),
    events: [...events].sort((a, b) => b.timestamp - a.timestamp),
    incidents: [...incidents].sort((a, b) => a.rank - b.rank || b.priorityScore - a.priorityScore),
    resources,
    assignments: [...assignments].sort((a, b) => b.updatedAt - a.updatedAt),
    hazards,
    logs: [...logs].sort((a, b) => b.at - a.at).slice(0, 40),
    sitrep,
  };
}
