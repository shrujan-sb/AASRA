import { NextResponse } from "next/server";
import type { Incident, IncidentHelper } from "@/lib/types";
import { parseSupportKind } from "@/lib/supportKind";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    incident?: Pick<Incident, "id" | "helper">;
    helper?: IncidentHelper;
  };
  const incident = body.incident;
  const helper = body.helper;
  if (!incident?.id || !helper?.email) {
    return NextResponse.json({ ok: false, error: "Missing ticket or unit." }, { status: 400 });
  }

  const who: IncidentHelper = {
    ...helper,
    kind: parseSupportKind(helper.kind),
    email: helper.email.trim().toLowerCase(),
    at: helper.at || Date.now(),
  };

  const rest = await import("@/lib/firestoreRest");
  const existing = await rest.getFirestoreDoc("incidents", incident.id);
  const currentHelper = existing?.helper as IncidentHelper | undefined;
  if (currentHelper?.email && currentHelper.email.toLowerCase() !== who.email) {
    return NextResponse.json({
      ok: true,
      allow: false,
      taken: true,
      summary: `${currentHelper.name} took the initiative.`,
    });
  }
  if (incident.helper && incident.helper.email.toLowerCase() !== who.email) {
    return NextResponse.json({
      ok: true,
      allow: false,
      taken: true,
      summary: `${incident.helper.name} took the initiative.`,
    });
  }

  void rest.createFirestoreDoc("incidents", incident.id, {
    helper: who,
    status: "assigned",
    updatedAt: Date.now(),
  });

  return NextResponse.json({
    ok: true,
    allow: true,
    taken: false,
    summary: `${who.name} took the initiative.`,
  });
}
