import { NextResponse } from "next/server";
import { filePublicReport } from "@/lib/fileReport";
import { parseOmniCall } from "@/lib/omnidim";

export const maxDuration = 60;

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-aasra-secret");
  return res;
}

function json(body: unknown, status = 200) {
  return cors(NextResponse.json(body, { status }));
}

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
  const text = await req.text();
  if (!text.trim()) return fromQuery;
  try {
    const body = JSON.parse(text) as unknown;
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return { ...fromQuery, ...(body as Record<string, unknown>) };
    }
  } catch {
    fromQuery.raw_body = text;
  }
  return fromQuery;
}

async function handle(req: Request) {
  try {
    if (!authorized(req)) {
      return json({ ok: false, success: false, error: "Unauthorized." }, 401);
    }

    const payload = await readPayload(req);
    const intake = parseOmniCall(payload);
    const location = intake.location || (intake.need ? "Place given on the call" : "");
    const need = intake.need || intake.summary || (intake.location ? "Relief help requested on the call" : "");

    if (!location && !need) {
      return json({ ok: true, success: true, service: "aasra-omnidimension", ready: true });
    }

    const filed = await filePublicReport(
      {
        location: location || "Place given on the call",
        need: need || "Relief help requested on the call",
        name: intake.name || undefined,
        phone: intake.phone || undefined,
        callId: intake.callId || undefined,
        channel: "phone",
        inboxId: intake.callId ? `IN-OD-${intake.callId}` : undefined,
      },
      { wait: true },
    );

    const speech =
      "Your help request is filed with Aasra. A desk near you will see it. I am ending the call now.";
    return json({
      ok: true,
      success: true,
      filed: true,
      status: "filed",
      message: speech,
      confirmation: speech,
      speech,
      id: filed.id,
      incidentId: filed.incidentId,
    });
  } catch (err) {
    console.error("omnidimension", err);
    return json({
      ok: true,
      success: true,
      filed: false,
      status: "queued",
      message: "Aasra has the call details. Tell the caller the desk has their request, then end the call.",
      confirmation: "The request is with Aasra. I am ending the call now.",
      speech: "The request is with Aasra. I am ending the call now.",
    });
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}
