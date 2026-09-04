import type { IncidentNear, IncidentReason, Severity, SupportApplication, SupportKind } from "@/lib/types";

export type ReportStudy = IncidentReason & {
  severity?: Severity;
  priorityScore?: number;
  resource?: string;
  quantity?: number;
  title?: string;
  verification?: "verified" | "uncertain" | "conflicting";
  routeEmails?: string[];
};

export type ApplicationClerk = {
  allow: boolean;
  summary: string;
  flags: string[];
  confidence: number;
  autoStamped?: boolean;
  model?: string;
};

export type ClaimClerk = {
  allow: boolean;
  summary: string;
  confidence: number;
  model?: string;
};

const FALLBACK_MODELS = [
  process.env.FEATHERLESS_MODEL,
  "Qwen/Qwen3-8B",
  "Qwen/Qwen2.5-7B-Instruct",
].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

const SYSTEM =
  "You are Aasra's duty clerk for a Krishna-delta flood sector. You are the brain of the desk: you read, check, rank, and decide. Reply with JSON only. No markdown. No preamble.";

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = stripThink(raw);
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function complete(model: string, key: string, user: string, signal: AbortSignal): Promise<{ text: string; model: string } | null> {
  const res = await fetch("https://api.featherless.ai/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://aasra.vercel.app",
      "X-Title": "Aasra ReliefMesh",
    },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      max_tokens: 1400,
      chat_template_kwargs: { enable_thinking: true, thinking: true },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null; reasoning_content?: string | null } }[];
  };
  const msg = data.choices?.[0]?.message;
  const content = [msg?.content, msg?.reasoning_content].filter(Boolean).join("\n");
  if (!content.trim()) return null;
  return { text: content, model };
}

export async function brainRaw(user: string, timeoutMs = 22000): Promise<{ json: Record<string, unknown>; model: string } | null> {
  const key = process.env.FEATHERLESS_API_KEY;
  if (!key) {
    console.error("featherless: FEATHERLESS_API_KEY missing");
    return null;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    for (const model of FALLBACK_MODELS) {
      try {
        const hit = await complete(model, key, user, ctrl.signal);
        if (!hit) continue;
        const json = parseJsonObject(hit.text);
        if (json) return { json, model: hit.model };
      } catch {
        continue;
      }
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function studyReport(input: {
  location: string;
  need: string;
  name?: string;
  heuristicSeverity: Severity;
  heuristicScore: number;
  resource: string;
  nearest?: IncidentNear[];
}): Promise<ReportStudy | null> {
  const desks = (input.nearest ?? [])
    .map((n) => `${n.orgName} <${n.email}> ${n.kind} ${n.km}km`)
    .join("\n");
  const hit = await brainRaw(
    `Decide this field report. You override heuristics if they are wrong. Return JSON:
{"severity":"critical"|"high"|"normal","priorityScore":0-250,"resource":"short noun","quantity":number,"title":"short desk title","verification":"verified"|"uncertain"|"conflicting","summary":"2-3 sentences: what is happening, why it matters, what you decided","risks":["..."],"actions":["first move","second"],"peopleEstimate":number,"confidence":0-1,"decision":"one sentence of the ruling","routeEmails":["email of first desk to notify"]}

Rules: critical = life at risk (trapped, rooftop, evac, drowning, ambulance). high = medical or large urgent need. normal = blankets, food, water without immediate danger. Do not mark everything high. Pick routeEmails from the candidate desks only, nearest capable first. If none, empty array.

Location: ${input.location}
Need: ${input.need}
Reporter: ${input.name || "anonymous"}
Heuristic resource: ${input.resource}
Heuristic severity: ${input.heuristicSeverity} (${input.heuristicScore})
Candidate desks:
${desks || "(none on file)"}`,
  );
  if (!hit) return null;
  const j = hit.json;
  const severity = j.severity;
  const sev: Severity | undefined =
    severity === "critical" || severity === "high" || severity === "normal" ? severity : undefined;
  const summary = String(j.summary ?? j.decision ?? "").trim();
  if (!summary) return null;
  return {
    summary,
    risks: Array.isArray(j.risks) ? j.risks.map(String).slice(0, 5) : [],
    actions: Array.isArray(j.actions) ? j.actions.map(String).slice(0, 5) : [],
    peopleEstimate: typeof j.peopleEstimate === "number" ? j.peopleEstimate : undefined,
    confidence: typeof j.confidence === "number" ? j.confidence : undefined,
    decision: String(j.decision ?? summary).trim(),
    model: hit.model,
    severity: sev,
    priorityScore: typeof j.priorityScore === "number" ? Math.round(j.priorityScore) : undefined,
    resource: typeof j.resource === "string" ? j.resource : undefined,
    quantity: typeof j.quantity === "number" ? j.quantity : undefined,
    title: typeof j.title === "string" ? j.title : undefined,
    verification:
      j.verification === "verified" || j.verification === "uncertain" || j.verification === "conflicting"
        ? j.verification
        : undefined,
    routeEmails: Array.isArray(j.routeEmails) ? j.routeEmails.map(String) : [],
  };
}

export async function clerkApplication(row: SupportApplication): Promise<ApplicationClerk | null> {
  const hit = await brainRaw(
    `Review this support application. Decide allow or hold. Return JSON:
{"allow":true|false,"summary":"2 sentences on why","flags":["missing field or risk"],"confidence":0-1}

Allow only if the file looks like a real government or NGO/volunteer posting with name, email, area, and an ID or registration number. Hold if fields are thin, contradictory, or look like a joke. You cannot see the photo; judge the text.

Kind: ${row.kind}
Name: ${row.name}
Email: ${row.email}
Department: ${row.department || ""}
Designation: ${row.designation || ""}
ID: ${row.idNumber || ""}
Org: ${row.orgName || ""}
Role: ${row.volunteerRole || ""}
Reg: ${row.registrationNo || ""}
Phone: ${row.phone || ""}
Area: ${row.areaLabel || ""}
Note: ${row.note || ""}
Has photo: ${row.photoDataUrl ? "yes" : "no"}`,
    18000,
  );
  if (!hit) return null;
  const j = hit.json;
  const summary = String(j.summary ?? "").trim();
  if (!summary) return null;
  const confidence = typeof j.confidence === "number" ? j.confidence : 0.5;
  const allow = Boolean(j.allow) && Boolean(row.photoDataUrl) && Boolean(row.areaLabel);
  return {
    allow,
    summary,
    flags: Array.isArray(j.flags) ? j.flags.map(String).slice(0, 6) : [],
    confidence,
    autoStamped: allow && confidence >= 0.78,
    model: hit.model,
  };
}

export async function clerkClaim(input: {
  title: string;
  location: string;
  severity: Severity;
  nearest?: IncidentNear[];
  helperName: string;
  helperOrg: string;
  helperKind: SupportKind;
  helperEmail: string;
  helperKm?: number;
}): Promise<ClaimClerk | null> {
  const hit = await brainRaw(
    `A field unit pressed Help on a ticket. Decide if they may take it. Return JSON:
{"allow":true|false,"summary":"one or two sentences","confidence":0-1}

Allow if they are a plausible responder (listed in nearest, or close, or no one closer). Hold if someone much nearer exists and this unit is far, or if the ticket is already a mismatch (e.g. medical only and they are clearly not medical — still allow if they are the only unit).

Ticket: ${input.title}
Place: ${input.location}
Severity: ${input.severity}
Nearest desks: ${(input.nearest ?? []).map((n) => `${n.orgName} ${n.km}km`).join("; ") || "none"}
Unit: ${input.helperOrg} (${input.helperKind}) ${input.helperName} ${input.helperEmail}
Distance km: ${input.helperKm ?? "unknown"}`,
    14000,
  );
  if (!hit) return null;
  const j = hit.json;
  return {
    allow: Boolean(j.allow),
    summary: String(j.summary ?? (j.allow ? "Take it." : "Hold.")).trim(),
    confidence: typeof j.confidence === "number" ? j.confidence : 0.5,
    model: hit.model,
  };
}

export function reasonFromStudy(study: ReportStudy): IncidentReason {
  return {
    summary: study.summary,
    risks: study.risks,
    actions: study.actions,
    peopleEstimate: study.peopleEstimate,
    confidence: study.confidence,
    decision: study.decision,
    model: study.model,
  };
}
