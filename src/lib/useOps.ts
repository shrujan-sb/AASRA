"use client";

import { useEffect, useState } from "react";
import { listen } from "@/lib/db";
import { ensureSeeded, startLiveFeed } from "@/lib/pipeline";
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

export type OpsState = {
  inbox: InboxMessage[];
  events: StructuredEvent[];
  incidents: Incident[];
  resources: ResourceAsset[];
  assignments: Assignment[];
  hazards: Hazard[];
  logs: AgentLog[];
  sitrep: Sitrep | null;
};

const empty: OpsState = {
  inbox: [],
  events: [],
  incidents: [],
  resources: [],
  assignments: [],
  hazards: [],
  logs: [],
  sitrep: null,
};

export function useOps(): OpsState {
  const [state, setState] = useState<OpsState>(empty);

  useEffect(() => {
    void ensureSeeded().then(() => startLiveFeed());
    const unsubs = [
      listen<InboxMessage>("inbox", (inbox) => setState((s) => ({ ...s, inbox: inbox.sort((a, b) => b.timestamp - a.timestamp) }))),
      listen<StructuredEvent>("events", (events) =>
        setState((s) => ({ ...s, events: events.sort((a, b) => b.timestamp - a.timestamp) })),
      ),
      listen<Incident>("incidents", (incidents) =>
        setState((s) => ({ ...s, incidents: incidents.sort((a, b) => a.rank - b.rank) })),
      ),
      listen<ResourceAsset>("resources", (resources) => setState((s) => ({ ...s, resources }))),
      listen<Assignment>("assignments", (assignments) =>
        setState((s) => ({ ...s, assignments: assignments.sort((a, b) => b.updatedAt - a.updatedAt) })),
      ),
      listen<Hazard>("hazards", (hazards) => setState((s) => ({ ...s, hazards }))),
      listen<AgentLog>("agentLogs", (logs) => setState((s) => ({ ...s, logs: logs.sort((a, b) => b.at - a.at).slice(0, 40) }))),
      listen<Sitrep>("sitrep", (rows) => setState((s) => ({ ...s, sitrep: rows.find((r) => r.id === "current") ?? null }))),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  return state;
}
