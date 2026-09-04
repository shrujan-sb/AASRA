import { NextResponse } from "next/server";
import { parseVerifyTag, stampIds, type VerifyClerkAsk } from "@/lib/agents/verification";
import { verifyCorpus } from "@/lib/featherless";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<VerifyClerkAsk>;
  if (!body.incoming?.id || !body.subjectKey || !body.heuristic) {
    return NextResponse.json({ ok: false, error: "Need incoming report and corpus." }, { status: 400 });
  }

  const ask: VerifyClerkAsk = {
    incoming: body.incoming,
    peers: Array.isArray(body.peers) ? body.peers : [],
    subjectKey: body.subjectKey,
    heuristic: parseVerifyTag(body.heuristic) ?? "uncertain",
    corroboration: typeof body.corroboration === "number" ? body.corroboration : 1,
  };

  const clerk = await verifyCorpus(ask);
  const verification = clerk?.verification ?? ask.heuristic;
  const ids = stampIds(ask.incoming.id, ask.peers, verification, ask.incoming.hazardStatus);

  return NextResponse.json({
    ok: true,
    studied: Boolean(clerk),
    verification,
    reason: clerk?.reason ?? `heuristic ${ask.heuristic}`,
    model: clerk?.model,
    corroboration: ask.corroboration,
    ids,
  });
}
