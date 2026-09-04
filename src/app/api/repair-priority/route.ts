import { NextResponse } from "next/server";
import { heuristicInfraRank } from "@/lib/dispatch";
import { rankRepairs } from "@/lib/featherless";
import { SEED_INFRA } from "@/lib/seed";
import type { Hazard, InfraAsset } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function asAssets(raw: unknown): InfraAsset[] {
  return Array.isArray(raw) ? (raw as InfraAsset[]) : [];
}

function asHazards(raw: unknown): Hazard[] {
  return Array.isArray(raw) ? (raw as Hazard[]) : [];
}

export async function POST(req: Request) {
  let body: { assets?: unknown; hazards?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const incoming = asAssets(body.assets);
  const hazards = asHazards(body.hazards);
  const seed = incoming.length ? incoming : SEED_INFRA;
  const base = heuristicInfraRank(seed, hazards);
  const clerk = await rankRepairs({ assets: base, hazards });
  const byId = new Map(clerk?.rows.map((r) => [r.id, r]));
  const repairs = base
    .map((row) => {
      const hit = byId.get(row.id);
      if (!hit) return { ...row, model: clerk?.model };
      return {
        ...row,
        score: hit.score || row.score,
        reason: hit.reason || row.reason,
        consequences: hit.consequences.length ? hit.consequences : row.consequences,
        model: clerk?.model,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  return NextResponse.json({
    ok: true,
    studied: Boolean(clerk),
    model: clerk?.model,
    repairs,
  });
}
