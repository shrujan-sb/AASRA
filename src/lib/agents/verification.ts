import type { StructuredEvent, VerificationTag } from "@/lib/types";
import type { IntakeOutput } from "@/lib/agents/intake";

export type VerificationInput = {
  incoming: IntakeOutput;
  corpus: StructuredEvent[];
};

export type VerificationOutput = Pick<StructuredEvent, "id" | "verification" | "corroboration"> & {
  reason?: string;
};

export type VerifyPeer = {
  id: string;
  timestamp: number;
  source: string;
  text: string;
  hazardStatus?: StructuredEvent["hazardStatus"];
};

export type VerifyClerkAsk = {
  incoming: VerifyPeer;
  peers: VerifyPeer[];
  subjectKey: string;
  heuristic: VerificationTag;
  corroboration: number;
};

export function collectPeers(
  incoming: Pick<IntakeOutput, "id" | "subjectKey">,
  corpus: StructuredEvent[],
): StructuredEvent[] {
  return corpus.filter((e) => e.subjectKey === incoming.subjectKey && e.id !== incoming.id);
}

function asPeer(row: Pick<IntakeOutput, "id" | "timestamp" | "source" | "translated" | "rawText" | "hazardStatus">): VerifyPeer {
  return {
    id: row.id,
    timestamp: row.timestamp,
    source: row.source,
    text: row.translated || row.rawText,
    hazardStatus: row.hazardStatus,
  };
}

export function heuristicVerify({ incoming, corpus }: VerificationInput): VerificationOutput {
  const peers = collectPeers(incoming, corpus);
  const corroboration = peers.length + 1;
  let verification: VerificationTag = "uncertain";

  if (incoming.type === "hazard_report") {
    const statuses = [incoming.hazardStatus, ...peers.map((p) => p.hazardStatus)].filter(Boolean);
    const unique = new Set(statuses);
    if (unique.size > 1) verification = "conflicting";
    else if (corroboration >= 2 || incoming.sourceReliability >= 0.85) verification = "verified";
    else verification = "uncertain";
  } else if (incoming.sourceReliability >= 0.85 || corroboration >= 2) {
    verification = "verified";
  } else {
    verification = "uncertain";
  }

  const latestPeer = [...peers].sort((a, b) => b.timestamp - a.timestamp)[0];
  if (latestPeer && incoming.type === "hazard_report" && latestPeer.hazardStatus !== incoming.hazardStatus) {
    verification = "conflicting";
  }

  return { id: incoming.id, verification, corroboration };
}

export function clerkAsk(input: VerificationInput, heuristic: VerificationOutput): VerifyClerkAsk {
  return {
    incoming: asPeer(input.incoming),
    peers: collectPeers(input.incoming, input.corpus).map(asPeer),
    subjectKey: input.incoming.subjectKey,
    heuristic: heuristic.verification,
    corroboration: heuristic.corroboration,
  };
}

export function parseVerifyTag(raw: unknown): VerificationTag | undefined {
  return raw === "verified" || raw === "uncertain" || raw === "conflicting" ? raw : undefined;
}

export function stampIds(
  incomingId: string,
  peers: VerifyPeer[],
  tag: VerificationTag,
  incomingHazard?: StructuredEvent["hazardStatus"],
): string[] {
  const ids = [incomingId];
  if (tag !== "conflicting") return ids;
  for (const p of peers) {
    if (p.hazardStatus && incomingHazard && p.hazardStatus !== incomingHazard && p.hazardStatus !== "unknown") {
      ids.push(p.id);
    }
  }
  return ids;
}

export const VerificationAgent = {
  name: "verification" as const,
  memory: new Map<string, VerificationTag>(),
  run(input: VerificationInput): VerificationOutput {
    const out = heuristicVerify(input);
    this.memory.set(out.id, out.verification);
    return out;
  },
  ask(input: VerificationInput): { heuristic: VerificationOutput; clerk: VerifyClerkAsk } {
    const heuristic = this.run(input);
    return { heuristic, clerk: clerkAsk(input, heuristic) };
  },
  accept(id: string, tag: VerificationTag, corroboration: number, reason?: string): VerificationOutput {
    this.memory.set(id, tag);
    return { id, verification: tag, corroboration, reason };
  },
};
