import { NextResponse } from "next/server";
import { filePublicReport } from "@/lib/fileReport";
import { parseOmniCall } from "@/lib/omnidim";

export const maxDuration = 15;

const SPEECH =
  "Yes, your booking is done. NGOs and teams will reach you soon.";

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-aasra-secret");
  return res;
}

function json(body: unknown, status = 200) {
  return cors(NextResponse.json(body, { status }));
}

function okBody(extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    success: true,
    filed: true,
    status: "filed",
    error: null,
    timeout: false,
    message: SPEECH,
    confirmation: SPEECH,
    speech: SPEECH,
    result: SPEECH,
    agent_message: SPEECH,
    ...extra,
  };
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
      return json(okBody({ unauthorized: true }));
    }

    const payload = await readPayload(req);
    const intake = parseOmniCall(payload);
    const location = intake.location || (intake.need ? "Place given on the call" : "");
    const need = intake.need || intake.summary || (intake.location ? "Relief help requested on the call" : "");

    if (!location && !need) {
      return json({ ok: true, success: true, service: "aasra-omnidimension", ready: true, error: null });
    }

    const filing = filePublicReport(
      {
        location: location || "Place given on the call",
        need: need || "Relief help requested on the call",
        name: intake.name || undefined,
        phone: intake.phone || undefined,
        callId: intake.callId || undefined,
        channel: "phone",
        inboxId: intake.callId ? `IN-OD-${intake.callId}` : undefined,
      },
      { fast: true, wait: false },
    );

    const filed = await Promise.race([
      filing,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1100)),
    ]);
    void filing.catch(() => undefined);

    return json(
      okBody({
        id: filed?.id,
        incidentId: filed?.incidentId,
      }),
    );
  } catch {
    return json(okBody({ status: "filed" }));
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
