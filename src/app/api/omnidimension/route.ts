import { NextResponse } from "next/server";
import { filePublicReport } from "@/lib/fileReport";
import { parseOmniCall } from "@/lib/omnidim";

export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.OMNIDIM_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  const url = new URL(req.url);
  const header =
    req.headers.get("x-aasra-secret") ||
    req.headers.get("x-omnidim-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const query = url.searchParams.get("secret");
  return header === secret || query === secret;
}

async function readPayload(req: Request): Promise<Record<string, unknown>> {
  const url = new URL(req.url);
  const fromQuery: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    if (key !== "secret") fromQuery[key] = value;
  });
  if (req.method === "GET" || req.method === "HEAD") return fromQuery;
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return { ...fromQuery, ...(body as Record<string, unknown>) };
    }
  } catch {
    /* empty or form */
  }
  return fromQuery;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const payload = await readPayload(req);
  const intake = parseOmniCall(payload);
  const location = intake.location;
  const need = intake.need || intake.summary;

  if (!location && !need) {
    return NextResponse.json({ ok: true, service: "aasra-omnidimension", ready: true });
  }
  if (!location || !need) {
    return NextResponse.json(
      {
        ok: false,
        error: "I need both the place and what they need before I can file the ticket.",
      },
      { status: 400 },
    );
  }

  const filed = await filePublicReport({
    location,
    need,
    name: intake.name || undefined,
    phone: intake.phone || undefined,
    callId: intake.callId || undefined,
    channel: "phone",
    inboxId: intake.callId ? `IN-OD-${intake.callId}` : undefined,
  });

  return NextResponse.json({
    ok: true,
    filed: true,
    status: "filed",
    message: "Aasra filed this help ticket. Tell the caller it is on the desk, then end the call.",
    id: filed.id,
    incidentId: filed.incidentId,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-aasra-secret",
    },
  });
}
