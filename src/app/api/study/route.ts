import { NextResponse } from "next/server";
import { reasonFromStudy, studyReport } from "@/lib/featherless";
import type { Severity } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      location?: string;
      need?: string;
      name?: string;
      resource?: string;
      heuristicSeverity?: Severity;
      heuristicScore?: number;
    };
    const location = String(body.location ?? "").trim();
    const need = String(body.need ?? "").trim();
    if (!location || !need) {
      return NextResponse.json({ ok: false, error: "Need a location and the report text." }, { status: 400 });
    }

    const study =
      (await studyReport({
        location,
        need,
        name: body.name,
        heuristicSeverity:
          body.heuristicSeverity === "critical" || body.heuristicSeverity === "high" || body.heuristicSeverity === "normal"
            ? body.heuristicSeverity
            : "normal",
        heuristicScore: typeof body.heuristicScore === "number" ? body.heuristicScore : 0,
        resource: String(body.resource ?? "supply"),
      }).catch(() => null));

    const reason = study
      ? reasonFromStudy(study)
      : reasonFromStudy({
          summary: `Desk reading of ${need} at ${location}.`,
          risks: [],
          actions: ["Send the nearest free unit."],
          decision: `Hold ${location} on the queue.`,
          model: "heuristic-fallback",
        });

    return NextResponse.json({
      ok: true,
      reason,
      severity: study?.severity,
      priorityScore: study?.priorityScore,
    });
  } catch (err) {
    console.error("study route", err);
    return NextResponse.json({
      ok: true,
      reason: {
        summary: `Desk reading of the report.`,
        risks: [],
        actions: ["Keep the ticket on Needs."],
        decision: "Heuristic hold.",
        model: "heuristic-fallback",
      },
    });
  }
}
