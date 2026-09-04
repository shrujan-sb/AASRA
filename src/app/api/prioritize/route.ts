import { NextResponse } from "next/server";
import { applyPriorityOverrides } from "@/lib/agents/prioritization";
import { rankEmergencies } from "@/lib/featherless";
import type { Incident } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as { incidents?: Incident[] };
  const incidents = (body.incidents ?? []).filter((i) => i.status !== "resolved");
  if (!incidents.length) {
    return NextResponse.json({ ok: true, incidents: [], studied: false });
  }

  const clerk = await rankEmergencies({
    incidents: incidents.map((i) => ({
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
  });

  if (!clerk) {
    return NextResponse.json({ ok: true, incidents, studied: false });
  }

  const ranked = applyPriorityOverrides(incidents, clerk.rows);
  return NextResponse.json({
    ok: true,
    incidents: ranked,
    studied: true,
    model: clerk.model,
  });
}
