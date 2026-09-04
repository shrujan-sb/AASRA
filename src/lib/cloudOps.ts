import { createFirestoreDoc, listFirestoreCol } from "@/lib/firestoreRest";
import type { FiledReport } from "@/lib/fileReport";

export async function persistTicketNow(ticket: FiledReport): Promise<boolean> {
  const rows = [
    ["inbox", ticket.inbox.id, ticket.inbox],
    ["events", ticket.event.id, ticket.event],
    ["incidents", ticket.incident.id, ticket.incident],
    ["agentLogs", ticket.log.id, ticket.log],
  ] as const;
  const results = await Promise.all(
    rows.map(([col, id, row]) => createFirestoreDoc(col, id, row as unknown as Record<string, unknown>)),
  );
  return results.every(Boolean);
}

export async function pullCloudOps(): Promise<number> {
  const cols = ["incidents", "events", "inbox", "agentLogs", "sitrep", "hazards", "assignments"] as const;
  let count = 0;
  for (const col of cols) {
    const rows = await listFirestoreCol(col);
    count += rows.length;
  }
  return count;
}
