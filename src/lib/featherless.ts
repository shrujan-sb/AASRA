import { coerceSitrep, fallbackSitrep } from "@/lib/agents/summary";
import type { VerifyClerkAsk } from "@/lib/agents/verification";
import { parseVerifyTag } from "@/lib/agents/verification";
import { coerceBrief, coercePreposition, fallbackBrief, fallbackPreposition, sectorContextText } from "@/lib/delta";
import { ROADS, WARDS } from "@/lib/geo";
import type {
  BeforeBrief,
  DispatchCandidate,
  EventType,
  Hazard,
  Incident,
  IncidentNear,
  IncidentReason,
  InfraAsset,
  Lang,
  PrepositionPlan,
  ResourceAsset,
  Sitrep,
  Severity,
  SupportApplication,
  SupportKind,
  VerificationTag,
} from "@/lib/types";

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
  "Qwen/Qwen2.5-7B-Instruct",
  process.env.FEATHERLESS_MODEL,
  "Qwen/Qwen3-8B",
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

function wantsThinking(model: string): boolean {
  return /Qwen3/i.test(model);
}

function messageText(msg: {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
} | undefined): string {
  if (!msg) return "";
  return [msg.content, msg.reasoning_content, typeof msg.reasoning === "string" ? msg.reasoning : ""]
    .filter((part) => typeof part === "string" && part.trim())
    .join("\n");
}

async function complete(
  model: string,
  key: string,
  user: string,
  signal: AbortSignal,
  maxTokens = 1400,
): Promise<{ text: string; model: string } | null> {
  const thinking = wantsThinking(model);
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
      max_tokens: maxTokens,
      ...(thinking ? { chat_template_kwargs: { enable_thinking: true, thinking: true } } : {}),
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: {
      message?: {
        content?: string | null;
        reasoning_content?: string | null;
        reasoning?: string | null;
      };
    }[];
  };
  const content = messageText(data.choices?.[0]?.message);
  if (!content.trim()) return null;
  return { text: content, model };
}

export async function brainRaw(
  user: string,
  timeoutMs = 22000,
  maxTokens = 1400,
): Promise<{ json: Record<string, unknown>; model: string } | null> {
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
        const hit = await complete(model, key, user, ctrl.signal, maxTokens);
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

Rules: life-safety first. 20 medical evacuations beat 500 food kits. Hospital/ICU power beats shelter water. Shelter water beats bulk food. Volume never promotes logistics over evac. critical = life at risk (trapped, rooftop, evac, drowning, ambulance). high = medical or hospital power. normal = blankets, food, water without immediate danger. You may override the heuristic score if it is wrong. Pick routeEmails from the candidate desks only, nearest capable first. If none, empty array.

Location: ${input.location}
Need: ${input.need}
Reporter: ${input.name || "anonymous"}
Heuristic resource: ${input.resource}
Heuristic severity: ${input.heuristicSeverity} (${input.heuristicScore})
Candidate desks:
${desks || "(none on file)"}`,
    22000,
    2000,
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
  resource?: string;
  nearest?: IncidentNear[];
  helperName: string;
  helperOrg: string;
  helperKind: SupportKind;
  helperEmail: string;
  helperKm?: number;
  aiPick?: string;
  candidates?: { callsign: string; etaMin: number; fit: number; equipment: string[]; available: boolean }[];
}): Promise<ClaimClerk | null> {
  const teams = (input.candidates ?? [])
    .slice(0, 8)
    .map(
      (c) =>
        `${c.callsign} eta ${c.etaMin} fit ${c.fit} gear ${c.equipment.join(",")} ${c.available ? "free" : "busy"}`,
    )
    .join("; ");
  const hit = await brainRaw(
    `A field unit pressed Help on a ticket. Decide if they may take it. Do not use nearest-only. Weight skills/equipment vs this need, danger, and travel.
Return JSON:
{"allow":true|false,"summary":"one or two sentences, include why this unit or why hold for a better team","confidence":0-1}

Allow if they can actually do the work (or no capable unit is free). Hold if a seeded rescue team is a clearly better match and free (e.g. flood-rescue gear for rooftop evac) while this helper is a mismatch or much less capable.

Ticket: ${input.title}
Need: ${input.resource || "unspecified"}
Place: ${input.location}
Severity: ${input.severity}
Clerk pick already: ${input.aiPick || "none"}
Nearest desks: ${(input.nearest ?? []).map((n) => `${n.orgName} ${n.km}km`).join("; ") || "none"}
Seed teams: ${teams || "none"}
Unit pressing Help: ${input.helperOrg} (${input.helperKind}) ${input.helperName} ${input.helperEmail}
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

export type RescuePickRow = {
  incidentId: string;
  resourceId: string;
  reason: string;
  etaMin?: number;
};

export type RerouteClerk = {
  affected: { incidentId: string; why: string }[];
  alternatives: string[];
  picks: RescuePickRow[];
  headline: string;
  model?: string;
};

export async function assignRescueTeams(input: {
  incidents: { id: string; title: string; resource: string; severity: Severity; locationLabel: string }[];
  candidatesByIncident: Record<string, DispatchCandidate[]>;
}): Promise<{ picks: RescuePickRow[]; model: string } | null> {
  const blocks = input.incidents
    .map((inc) => {
      const cands = (input.candidatesByIncident[inc.id] ?? [])
        .slice()
        .sort((a, b) => Number(b.available) - Number(a.available) || b.fit - a.fit || a.etaMin - b.etaMin)
        .slice(0, 10)
        .map(
          (c) =>
            `${c.resourceId}|${c.callsign}|loc:${c.locationId}|skills:${c.skills.join(",")}|gear:${c.equipment.join(",")}|eta:${c.etaMin}|fit:${c.fit}|danger:${c.danger}|available:${c.available}|status:${c.status}|blockedPath:${c.blockedOnPath.join(",") || "none"}`,
        )
        .join("\n");
      return `INC ${inc.id} | ${inc.title} | need:${inc.resource} | ${inc.severity} | ${inc.locationLabel}\n${cands || "(no units)"}`;
    })
    .join("\n\n");
  const hit = await brainRaw(
    `Assign rescue units. Do NOT pick nearest-only. Weight skills, equipment, availability, location, danger on path, and travel time (ETA). Prefer a capable unit 10–20 min farther over a nearer mismatch. Never assign a busy unit. Reason must look like: "Team 4 is best because flood-rescue equipment, 12 min."
Return JSON:
{"picks":[{"incidentId":"...","resourceId":"T4","reason":"Team 4 is best because flood-rescue equipment, 12 min.","etaMin":12}]}

Skip an incident if no capable free unit. resourceId must be the id from that incident's list (e.g. T4), not the callsign.

${blocks}`,
    24000,
    1800,
  );
  if (!hit) return null;
  const raw = hit.json.picks;
  if (!Array.isArray(raw)) return null;
  const picks: RescuePickRow[] = raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const incidentId = String(r.incidentId ?? "");
      const resourceId = String(r.resourceId ?? "");
      const reason = String(r.reason ?? "").trim();
      if (!incidentId || !resourceId || !reason) return null;
      const pick: RescuePickRow = { incidentId, resourceId, reason };
      if (typeof r.etaMin === "number") pick.etaMin = r.etaMin;
      return pick;
    })
    .filter((x): x is RescuePickRow => Boolean(x));
  if (!picks.length) return null;
  return { picks, model: hit.model };
}

export async function planReroute(input: {
  blockedLabel: string;
  blockedRoadIds: string[];
  affected: { incidentId: string; title: string; roads: string[]; oldEta: number; oldUnit: string }[];
  incidents: { id: string; title: string; resource: string; severity: Severity; locationLabel: string }[];
  candidatesByIncident: Record<string, DispatchCandidate[]>;
}): Promise<RerouteClerk | null> {
  const hit = await brainRaw(
    `A corridor just closed. Identify affected missions, name alternatives, reassign capable units, give new ETAs. Not nearest-only.
Return JSON:
{"headline":"one sentence for the desk","affected":[{"incidentId":"...","why":"path used NH-16"}],"alternatives":["use Bandar Road via GGH"],"picks":[{"incidentId":"...","resourceId":"...","reason":"Boat 5 is best because boats, 18 min after NH-16 close.","etaMin":18}]}

Closed: ${input.blockedLabel} (${input.blockedRoadIds.join(", ") || "unknown"})
Hit missions:
${input.affected.map((a) => `${a.incidentId} ${a.title} was ${a.oldUnit} eta ${a.oldEta} via ${a.roads.join("/")}`).join("\n") || "(none listed)"}

Open / rerouted tickets and units:
${input.incidents
  .map((inc) => {
    const cands = (input.candidatesByIncident[inc.id] ?? [])
      .filter((c) => c.available)
      .slice(0, 8)
      .map((c) => `${c.resourceId}|${c.callsign}|eta:${c.etaMin}|fit:${c.fit}|gear:${c.equipment.join(",")}|blocked:${c.blockedOnPath.join(",") || "no"}`)
      .join("; ");
    return `${inc.id} ${inc.title} ${inc.severity} @ ${inc.locationLabel} :: ${cands}`;
  })
  .join("\n")}`,
    24000,
    1800,
  );
  if (!hit) return null;
  const j = hit.json;
  const picksRaw = Array.isArray(j.picks) ? j.picks : [];
  const picks: RescuePickRow[] = picksRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const incidentId = String(r.incidentId ?? "");
      const resourceId = String(r.resourceId ?? "");
      const reason = String(r.reason ?? "").trim();
      if (!incidentId || !resourceId || !reason) return null;
      const pick: RescuePickRow = { incidentId, resourceId, reason };
      if (typeof r.etaMin === "number") pick.etaMin = r.etaMin;
      return pick;
    })
    .filter((x): x is RescuePickRow => Boolean(x));
  return {
    headline: String(j.headline ?? "Corridor closed — missions reassigned.").trim(),
    affected: Array.isArray(j.affected)
      ? j.affected
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const r = row as Record<string, unknown>;
            return { incidentId: String(r.incidentId ?? ""), why: String(r.why ?? "") };
          })
          .filter((x): x is { incidentId: string; why: string } => Boolean(x?.incidentId))
      : [],
    alternatives: Array.isArray(j.alternatives) ? j.alternatives.map(String).slice(0, 6) : [],
    picks,
    model: hit.model,
  };
}

export async function rankRepairs(input: {
  assets: InfraAsset[];
  hazards: Hazard[];
}): Promise<{ rows: Pick<InfraAsset, "id" | "score" | "reason" | "consequences">[]; model: string } | null> {
  const blocked = input.hazards.filter((h) => h.status === "blocked").map((h) => `${h.roadId} (${h.label})`);
  const hit = await brainRaw(
    `Rank damaged roads/bridges for repair first. Combine damage, traffic, hospital access, evac routes, population, and knock-on if left broken.
Return JSON:
{"repairs":[{"id":"INF-NH16","score":0-100,"reason":"one sentence why this is first or next","consequences":["if delayed, ..."]}]}

Use only these ids. Higher score = repair sooner.

Assets:
${input.assets
  .map(
    (a) =>
      `${a.id} | ${a.name} | ${a.kind} | road ${a.roadId} | damage ${a.damage} traffic ${a.traffic} hospital ${a.hospitalAccess} evac ${a.evacRoute} population ${a.population} | now ${a.status}`,
  )
  .join("\n")}

Currently blocked: ${blocked.join("; ") || "none"}`,
    22000,
    1600,
  );
  if (!hit) return null;
  const raw = hit.json.repairs;
  if (!Array.isArray(raw)) return null;
  const rows = raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const id = String(r.id ?? "");
      if (!id) return null;
      return {
        id,
        score: typeof r.score === "number" ? r.score : 0,
        reason: String(r.reason ?? "").trim(),
        consequences: Array.isArray(r.consequences) ? r.consequences.map(String).slice(0, 4) : [],
      };
    })
    .filter((x): x is Pick<InfraAsset, "id" | "score" | "reason" | "consequences"> => Boolean(x));
  if (!rows.length) return null;
  return { rows, model: hit.model };
}

export async function predictBefore(input: {
  resources: ResourceAsset[];
  incidents?: Incident[];
  hazards?: Hazard[];
  timeoutMs?: number;
}): Promise<BeforeBrief | null> {
  const fallback = fallbackBrief(input);
  const units = input.resources
    .map(
      (r) =>
        `${r.id} ${r.callsign} ${r.kind} @${r.locationId} ${r.status} skills=${r.skills.join("/")} gear=${r.equipment.join("/")}`,
    )
    .join("\n");
  const open = (input.incidents ?? [])
    .filter((i) => i.status !== "resolved")
    .map((i) => `${i.id} ${i.severity} @${i.locationId} ${i.title}`)
    .join("\n");
  const blocked = (input.hazards ?? [])
    .filter((h) => h.status === "blocked")
    .map((h) => `${h.roadId} ${h.label}`)
    .join("; ");
  const hit = await brainRaw(
    `${sectorContextText()}

UNITS ON THE BOARD (use these ids only for moves):
${units || "(none)"}

OPEN TICKETS:
${open || "(quiet)"}

BLOCKED ROADS: ${blocked || "none"}

You are planning BEFORE the cyclone makes landfall. Return JSON only:
{"headline":"one sentence like: Ward 17 has unusually high flood risk over the next 24–48 hours.","windowHours":48,"orders":"one sentence: Before the cyclone arrives, move N rescue boats, N medical teams and N water tankers to these locations.","risks":[{"wardId":"W17","wardName":"...","level":"high"|"elevated"|"watch","horizonHours":36,"blurb":"one sentence","drivers":["rainfall","terrain","history","population"]}],"vulnerable":[{"kind":"school"|"hospital"|"elderly"|"road"|"substation"|"shelter","name":"...","wardId":"...","why":"operational hit","action":"first move"}],"moves":[{"resourceId":"BOAT-5","callsign":"...","fromId":"W5","toId":"W17","toLabel":"...","why":"why this unit to this site"}]}

Rules: reason from rainfall, terrain, flood history, and population. Name Krishna-delta wards that exist above. Vulnerability is an operational list, not a map. Pre-position only free units. Prefer boats to W17/W3/W4/SH-C, medical to W17 and HOSP, tankers to shelters and canal belt. Do not invent resource ids.`,
    input.timeoutMs ?? 32000,
    2200,
  );
  if (!hit) return null;
  const brief = coerceBrief(hit.json, fallback);
  brief.model = hit.model;
  if (!brief.risks.length) brief.risks = fallback.risks;
  if (!brief.headline) return null;
  return brief;
}

export async function planPreposition(input: {
  resources: ResourceAsset[];
  incidents?: Incident[];
  hazards?: Hazard[];
  timeoutMs?: number;
}): Promise<PrepositionPlan | null> {
  const fallback = fallbackPreposition(input);
  const free = input.resources.filter((r) => r.status === "free");
  const units = free
    .map(
      (r) =>
        `${r.id} ${r.callsign} ${r.kind} @${r.locationId} skills=${r.skills.join("/")} gear=${r.equipment.join("/")}`,
    )
    .join("\n");
  const open = (input.incidents ?? [])
    .filter((i) => i.status !== "resolved")
    .map((i) => `${i.id} ${i.severity} @${i.locationId} ${i.title}`)
    .join("\n");
  const blocked = (input.hazards ?? [])
    .filter((h) => h.status === "blocked")
    .map((h) => `${h.roadId} ${h.label}`)
    .join("; ");
  const hit = await brainRaw(
    `${sectorContextText()}

FREE UNITS (use these ids only):
${units || "(none)"}

OPEN TICKETS:
${open || "(quiet)"}

BLOCKED ROADS: ${blocked || "none"}

Optimize resource pre-positioning BEFORE the cyclone. Move only boats, medical teams, and water tankers to named locations. Do not invent ids. Prefer boats to W17/W3/W4/SH-C, medical to W17 and HOSP, tankers to SH-C/SH-B and the canal belt. One unit per move. Skip units already at the target.
Return JSON only:
{"headline":"one sentence on the staging order","orders":"Before the cyclone arrives, move N rescue boats, N medical teams and N water tankers to these named places.","boats":0,"medical":0,"tankers":0,"sites":[{"id":"W17","label":"Ward 17 Tenali canal belt","why":"why this site"}],"moves":[{"resourceId":"BOAT-5","callsign":"Boat 5","fromId":"W5","toId":"W17","toLabel":"Ward 17 Tenali canal belt","why":"why this unit here"}]}`,
    input.timeoutMs ?? 32000,
    1800,
  );
  if (!hit) return null;
  const plan = coercePreposition(hit.json, fallback, input.resources);
  plan.model = hit.model;
  if (!plan.moves.length) plan.moves = fallback.moves;
  if (!plan.headline) return null;
  return plan;
}

export async function composeSitrep(input: {
  incidents: Incident[];
  resources: ResourceAsset[];
  hazards: Hazard[];
  tick?: number;
  timeoutMs?: number;
}): Promise<Sitrep | null> {
  const base = fallbackSitrep({
    incidents: input.incidents,
    resources: input.resources,
    hazards: input.hazards,
    tick: input.tick,
  });
  const open = input.incidents
    .filter((i) => i.status !== "resolved")
    .map((i) => `${i.id} ${i.severity} @${i.locationLabel} need:${i.resource} ${i.title}`)
    .join("\n");
  const blocked = input.hazards
    .filter((h) => h.status === "blocked")
    .map((h) => `${h.roadId} ${h.label}`)
    .join("; ");
  const units = `${base.freeUnits} free / ${base.assignedUnits} committed of ${input.resources.length}`;
  const hit = await brainRaw(
    `${sectorContextText()}

OPEN TICKETS:
${open || "(quiet)"}

BLOCKED ROADS: ${blocked || "none"}
UNITS: ${units}

Board counts (keep these numbers unless you have a clear reason to round):
active=${base.activeIncidents} critical=${base.critical} high=${base.high} roadsBlocked=${base.roadsBlocked} sheltersNearCapacity=${base.sheltersNearCapacity}

Write a duty sitrep. Return JSON only:
{"headline":"one sentence for the duty rail: active, critical, blocked roads, shelter pressure","activeIncidents":number,"critical":number,"high":number,"roadsBlocked":number,"freeUnits":number,"assignedUnits":number,"sheltersNearCapacity":number,"predictedShortage":"one sentence naming the next shortage (water at a named shelter, medical, boats) or empty string","predictions":["short knock-on line"]}

Rules: name Krishna-delta places. If a shelter (SH-B / SH-C / Kanaka / Tenali camp) is taking water or food tickets, mark it near capacity. Predicted shortage must be operational, not weather poetry.`,
    input.timeoutMs ?? 18000,
    900,
  );
  if (!hit) return null;
  const sitrep = coerceSitrep(hit.json, base);
  sitrep.model = hit.model;
  if (!sitrep.headline) return null;
  return sitrep;
}

function fmtPeer(p: VerifyClerkAsk["incoming"]): string {
  const when = new Date(p.timestamp).toISOString();
  const status = p.hazardStatus && p.hazardStatus !== "unknown" ? p.hazardStatus : "n/a";
  return `${when} | ${p.id} | ${p.source} | status:${status} | ${p.text}`;
}

export async function verifyCorpus(
  ask: VerifyClerkAsk,
): Promise<{ verification: VerificationTag; reason: string; model?: string } | null> {
  const hit = await brainRaw(
    `Compare this incoming report against the corpus on the same subject. Use timestamps. Classic conflict: one source says a bridge/road is blocked, another says it is open.
Return JSON:
{"verification":"verified"|"uncertain"|"conflicting","reason":"one sentence"}

Rules:
- conflicting: contemporaneous reports disagree (blocked vs open / collapsed vs restored) with no clear later correction.
- verified: independent sources agree, or a clearly later update supersedes older ones (e.g. control room opens a road after an earlier block).
- uncertain: a single weak source, or the corpus is too thin to corroborate.
Do not change priority scores. Judge only verification.

Subject: ${ask.subjectKey}
Heuristic tag: ${ask.heuristic} (${ask.corroboration} sources)

Incoming (latest to judge):
${fmtPeer(ask.incoming)}

Corpus on this subject (older/other):
${ask.peers.length ? ask.peers.map(fmtPeer).join("\n") : "(none)"}`,
    16000,
    600,
  );
  if (!hit) return null;
  const verification = parseVerifyTag(hit.json.verification);
  if (!verification) return null;
  return {
    verification,
    reason: String(hit.json.reason ?? "").trim() || `${verification} vs corpus`,
    model: hit.model,
  };
}

export type PriorityOverrideRow = {
  id: string;
  priorityScore: number;
  severity?: Severity;
  why: string;
};

export async function rankEmergencies(input: {
  incidents: {
    id: string;
    title: string;
    resource: string;
    quantity: number;
    locationLabel: string;
    heuristicScore: number;
    heuristicSeverity: Severity;
    verification: string;
    why?: string;
  }[];
}): Promise<{ rows: PriorityOverrideRow[]; model: string } | null> {
  const rows = input.incidents.slice(0, 24);
  if (!rows.length) return null;
  const hit = await brainRaw(
    `Rank these open needs for a flood desk with scarce teams. Life-safety first. Return JSON:
{"ranks":[{"id":"INC-...","priorityScore":0-250,"severity":"critical"|"high"|"normal","why":"one sentence"}]}

Policy (do not violate unless evidence clearly says the heuristic missed a life threat):
- 20 people needing medical evacuation outrank 500 people needing food.
- A hospital that needs power outranks a shelter that needs water.
- Shelter water outranks bulk food.
- Quantity must not let logistics beat evac/medevac.
- You MAY override heuristic scores when wording or verification shows the heuristic is wrong.

Use only these ids. Higher score = go first.

${rows
  .map(
    (i) =>
      `${i.id} | ${i.title} | need:${i.resource} x${i.quantity} | ${i.locationLabel} | heuristic ${i.heuristicSeverity} ${i.heuristicScore} | ${i.verification} | ${i.why || ""}`,
  )
  .join("\n")}`,
    22000,
    1600,
  );
  if (!hit) return null;
  const raw = hit.json.ranks ?? hit.json.overrides ?? hit.json.incidents;
  if (!Array.isArray(raw)) return null;
  const out: PriorityOverrideRow[] = raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const id = String(r.id ?? "");
      if (!id) return null;
      const sev = r.severity;
      const item: PriorityOverrideRow = {
        id,
        priorityScore: typeof r.priorityScore === "number" ? r.priorityScore : 0,
        why: String(r.why ?? "").trim(),
      };
      if (sev === "critical" || sev === "high" || sev === "normal") item.severity = sev;
      return item;
    })
    .filter((x): x is PriorityOverrideRow => Boolean(x));
  if (!out.length) return null;
  return { rows: out, model: hit.model };
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

export function coerceLang(raw: unknown, text = ""): Lang {
  const s = String(raw ?? "").toLowerCase();
  if (s.startsWith("te") || s.includes("telugu")) return "te";
  if (s.startsWith("hi") || s.includes("hindi") || s.includes("devanagari")) return "hi";
  if (s.startsWith("en") || s.includes("english")) return "en";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

function placesCatalog(): string {
  const wards = WARDS.map((w) => `${w.id} = ${w.name}`).join("; ");
  const roads = ROADS.map((r) => `${r.id} = ${r.name}`).join("; ");
  return `Wards/sites: ${wards}. Roads: ${roads}.`;
}

export type TranslateClerk = {
  language: Lang;
  translated: string;
  model?: string;
};

export async function detectAndTranslate(text: string): Promise<TranslateClerk | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const hit = await brainRaw(
    `Detect the language of this field message and translate it into clear operational English.
Return JSON only:
{"language":"en"|"hi"|"te","translated":"English one or two sentences, no brackets, no language tags"}

Rules:
- language is the source: en English, hi Hindi, te Telugu. If mixed, pick the dominant script/language.
- If already English, copy the meaning into clean English (fix typos, keep facts).
- Do not wrap the translation in [HI→EN] or similar.
- Keep numbers, place names, and resource counts.

Text: ${trimmed}`,
    14000,
    500,
  );
  if (!hit) return null;
  const translated = String(hit.json.translated ?? hit.json.english ?? "").trim();
  if (!translated) return null;
  return {
    language: coerceLang(hit.json.language, trimmed),
    translated,
    model: hit.model,
  };
}

export type ChaoticIntakeClerk = {
  type: EventType;
  locationId: string;
  locationLabel: string;
  resource: string;
  quantity: number;
  hazardStatus?: "open" | "blocked" | "unknown";
  language: Lang;
  translated: string;
  model?: string;
};

export async function parseChaoticIntake(input: {
  rawText: string;
  source?: string;
}): Promise<ChaoticIntakeClerk | null> {
  const text = input.rawText.trim();
  if (!text) return null;
  const hit = await brainRaw(
    `Parse this chaotic field message (WhatsApp/radio/SMS, possibly Hindi or Telugu) into ONE structured event. It may be a NEED, an OFFER of aid, or a HAZARD (road/bridge open or blocked).
Return JSON only:
{"type":"request"|"offer"|"hazard_report","language":"en"|"hi"|"te","translated":"English one-liner","locationId":"known id or LOC-slug","locationLabel":"short place name","resource":"short noun (medicine, trucks, boats, access, flood-rescue team, water tankers, ...)","quantity":number,"hazardStatus":"open"|"blocked"|"unknown"|null}

Rules:
- request = people need aid (medicine, food, water, rescue, trapped/stranded).
- offer = someone HAS / can send / standing by with trucks, boats, staff, kits. Not a need.
- hazard_report = road/bridge/access blocked, open, collapsed, restored. resource is usually "access".
- Detect language. Translate into English in "translated" with no [HI→EN] wrapper.
- Map place to a known ward/site/road id when possible.
- quantity: people count if stuck; units offered or needed; default 1.
- hazardStatus only for hazard_report.

${placesCatalog()}

Source: ${input.source || "field"}
Text: ${text}`,
    18000,
    800,
  );
  if (!hit) return null;
  const j = hit.json;
  const type: EventType | null =
    j.type === "offer" || j.type === "hazard_report" || j.type === "request" ? j.type : null;
  const locationLabel = String(j.locationLabel ?? "").trim();
  const resource = String(j.resource ?? "").trim();
  const translated = String(j.translated ?? "").trim();
  if (!type || !locationLabel || !resource) return null;
  const locationId =
    String(j.locationId ?? "").trim() ||
    `LOC-${locationLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`;
  const clerk: ChaoticIntakeClerk = {
    type,
    locationId,
    locationLabel,
    resource,
    quantity: typeof j.quantity === "number" ? j.quantity : 1,
    language: coerceLang(j.language, text),
    translated: translated || text,
    model: hit.model,
  };
  if (type === "hazard_report") {
    clerk.hazardStatus =
      j.hazardStatus === "open" || j.hazardStatus === "blocked" || j.hazardStatus === "unknown"
        ? j.hazardStatus
        : "unknown";
  }
  return clerk;
}
