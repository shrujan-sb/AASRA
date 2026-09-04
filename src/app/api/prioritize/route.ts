import { NextResponse } from "next/server";
import { applyPriorityOverrides } from "@/lib/agents/prioritization";
import { rankEmergencies } from "@/lib/featherless";
import { asIncidentList, rankOpenIncidents } from "@/lib/instantPriority";
import type { Incident } from "@/lib/types";

export const dynamic = "force-dynamic";

let inFlight = false;

export async function POST(req: Request) {
  let incidents: Incident[] = [];
  try {
    const body = (await req.json()) as { incidents?: unknown };
    incidents = asIncidentList(body.incidents);
  } catch {
    incidents = [];
  }

  const ranked = rankOpenIncidents(incidents);
  if (!ranked.length) {
    return NextResponse.json({ ok: true, incidents: [], studied: false });
  }
  if (inFlight) {
    return NextResponse.json({ ok: true, incidents: ranked, studied: false, queued: true });
  }

  inFlight = true;
  try {
    const clerk = await Promise.race([
      rankEmergencies({
        incidents: ranked.slice(0, 40).map((i) => ({
          id: i.id,
          title: i.title,
          resource: i.resource,
          quantity: i.quantity,
          locationLabel: i.locationLabel,
          heuristicScore: i.heuristicScore ?? i.priorityScore,
          heuristicSeverity: i.severity,
          verification: i.verification,
          why: i.priorityWhy,
        })),
      }).catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
    ]);
    if (!clerk) {
      return NextResponse.json({ ok: true, incidents: ranked, studied: false });
    }
    return NextResponse.json({
      ok: true,
      incidents: applyPriorityOverrides(ranked, clerk.rows),
      studied: true,
      model: clerk.model,
    });
  } catch {
    return NextResponse.json({ ok: true, incidents: ranked, studied: false });
  } finally {
    inFlight = false;
  }
}
