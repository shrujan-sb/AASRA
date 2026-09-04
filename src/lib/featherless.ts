import type { IncidentReason, Severity } from "@/lib/types";

export type ReportStudy = IncidentReason & {
  severity?: Severity;
  priorityScore?: number;
};

const FALLBACK_MODELS = [
  process.env.FEATHERLESS_MODEL,
  "Qwen/Qwen3-8B",
  "Qwen/Qwen2.5-7B-Instruct",
].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function parseStudy(raw: string, model: string): ReportStudy | null {
  const cleaned = stripThink(raw);
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const j = JSON.parse(match[0]) as Record<string, unknown>;
    const severity = j.severity;
    const sev: Severity | undefined =
      severity === "critical" || severity === "high" || severity === "normal" ? severity : undefined;
    const risks = Array.isArray(j.risks) ? j.risks.map(String).slice(0, 5) : [];
    const actions = Array.isArray(j.actions) ? j.actions.map(String).slice(0, 5) : [];
    const summary = String(j.summary ?? "").trim();
    if (!summary) return null;
    return {
      summary,
      risks,
      actions,
      peopleEstimate: typeof j.peopleEstimate === "number" ? j.peopleEstimate : undefined,
      confidence: typeof j.confidence === "number" ? j.confidence : undefined,
      severity: sev,
      priorityScore: typeof j.priorityScore === "number" ? Math.round(j.priorityScore) : undefined,
      model,
    };
  } catch {
    return null;
  }
}

async function complete(model: string, key: string, user: string, signal: AbortSignal): Promise<string | null> {
  const res = await fetch("https://api.featherless.ai/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://aasra-kappa.vercel.app",
      "X-Title": "Aasra ReliefMesh",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1200,
      chat_template_kwargs: { enable_thinking: true, thinking: true },
      messages: [
        {
          role: "system",
          content:
            "You are the night clerk of a Krishna-delta flood desk. Study field reports carefully. Reply with JSON only. No markdown.",
        },
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
  return content || null;
}

export async function studyReport(input: {
  location: string;
  need: string;
  name?: string;
  heuristicSeverity: Severity;
  heuristicScore: number;
  resource: string;
}): Promise<ReportStudy | null> {
  const key = process.env.FEATHERLESS_API_KEY;
  if (!key) return null;

  const user = `Study this public report and return JSON:
{"severity":"critical"|"high"|"normal","priorityScore":0-250,"summary":"2-3 sentences on what is happening and why it matters","risks":["..."],"actions":["first field move","second"],"peopleEstimate":number,"confidence":0-1}

Rules: critical = life at risk (trapped, rooftop, evac, drowning, ambulance). high = medical or large urgent need. normal = blankets, food, water without immediate danger. Do not mark everything high.

Location: ${input.location}
Need: ${input.need}
Reporter: ${input.name || "anonymous"}
Heuristic resource: ${input.resource}
Heuristic severity: ${input.heuristicSeverity} (${input.heuristicScore})`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 16000);
  try {
    for (const model of FALLBACK_MODELS) {
      try {
        const raw = await complete(model, key, user, ctrl.signal);
        if (!raw) continue;
        const parsed = parseStudy(raw, model);
        if (parsed) return parsed;
      } catch {
        continue;
      }
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function reasonFromStudy(study: ReportStudy): IncidentReason {
  return {
    summary: study.summary,
    risks: study.risks,
    actions: study.actions,
    peopleEstimate: study.peopleEstimate,
    confidence: study.confidence,
    model: study.model,
  };
}
