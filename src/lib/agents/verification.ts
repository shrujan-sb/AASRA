import type { StructuredEvent, VerificationTag } from "@/lib/types";
import type { IntakeOutput } from "@/lib/agents/intake";

export type VerificationInput = {
  incoming: IntakeOutput;
  corpus: StructuredEvent[];
};

export type VerificationOutput = Pick<StructuredEvent, "id" | "verification" | "corroboration">;

export const VerificationAgent = {
  name: "verification" as const,
  memory: new Map<string, VerificationTag>(),
  run({ incoming, corpus }: VerificationInput): VerificationOutput {
    const peers = corpus.filter((e) => e.subjectKey === incoming.subjectKey && e.id !== incoming.id);
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

    this.memory.set(incoming.id, verification);
    return { id: incoming.id, verification, corroboration };
  },
};
