import { NextResponse } from "next/server";
import { filePublicReport } from "@/lib/fileReport";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    location?: string;
    address?: string;
    need?: string;
    requirement?: string;
    name?: string;
    phone?: string;
    lat?: number;
    lng?: number;
  };
  const location = String(body.location ?? body.address ?? "").trim();
  const need = String(body.need ?? body.requirement ?? "").trim();
  if (!location || !need) {
    return NextResponse.json({ ok: false, error: "Location and need are required." }, { status: 400 });
  }

  const filed = await filePublicReport({
    location,
    need,
    name: body.name,
    phone: body.phone,
    lat: typeof body.lat === "number" ? body.lat : undefined,
    lng: typeof body.lng === "number" ? body.lng : undefined,
    channel: "web",
  });

  return NextResponse.json({
    ok: true,
    id: filed.id,
    incidentId: filed.incidentId,
    studied: false,
    ticket: filed.ticket,
  });
}