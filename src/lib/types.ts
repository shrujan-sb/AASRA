export type EventType = "request" | "offer" | "hazard_report";
export type PipelineStage = "received" | "structured" | "verified" | "prioritized" | "assigned";
export type VerificationTag = "verified" | "uncertain" | "conflicting";
export type Severity = "critical" | "high" | "normal";
export type ResourceKind = "team" | "vehicle" | "medical" | "supply";
export type ResourceStatus = "free" | "assigned" | "en_route" | "committed";
export type Lang = "en" | "hi" | "te";
export type SupportKind = "government" | "ngo" | "volunteer";
export type ApplicationStatus = "pending" | "allowed" | "rejected";

export type StructuredEvent = {
  id: string;
  type: EventType;
  locationId: string;
  locationLabel: string;
  resource: string;
  quantity: number;
  urgencySignal: number;
  rawText: string;
  timestamp: number;
  source: string;
  sourceReliability: number;
  language: Lang;
  translated: string;
  subjectKey: string;
  hazardStatus?: "open" | "blocked" | "unknown";
  verification: VerificationTag;
  corroboration: number;
  stage: PipelineStage;
  incidentId?: string;
  assignmentId?: string;
};

export type InboxMessage = {
  id: string;
  rawText: string;
  source: string;
  timestamp: number;
  languageHint?: Lang;
  processed: boolean;
};

export type IncidentPick = {
  resourceId: string;
  callsign: string;
  reason: string;
  etaMin: number;
  model?: string;
};

export type Incident = {
  id: string;
  eventId: string;
  type: EventType;
  title: string;
  locationId: string;
  locationLabel: string;
  resource: string;
  quantity: number;
  severity: Severity;
  priorityScore: number;
  rank: number;
  priorityWhy?: string;
  heuristicScore?: number;
  scoreSource?: "heuristic" | "ai";
  verification: VerificationTag;
  status: "open" | "assigned" | "rerouted" | "resolved";
  createdAt: number;
  updatedAt: number;
  reason?: IncidentReason;
  lat?: number;
  lng?: number;
  helper?: IncidentHelper;
  nearest?: IncidentNear[];
  aiPick?: IncidentPick;
  claimNote?: string;
  phone?: string;
  callId?: string;
  channel?: "web" | "phone";
};

export type IncidentReason = {
  summary: string;
  risks: string[];
  actions: string[];
  peopleEstimate?: number;
  confidence?: number;
  decision?: string;
  model?: string;
};

export type IncidentHelper = {
  email: string;
  name: string;
  orgName: string;
  kind: SupportKind;
  at: number;
};

export type IncidentNear = {
  email: string;
  name: string;
  orgName: string;
  kind: SupportKind;
  km: number;
};

export type ResourceAsset = {
  id: string;
  callsign: string;
  kind: ResourceKind;
  skills: string[];
  equipment: string[];
  locationId: string;
  status: ResourceStatus;
  assignedIncidentId?: string;
  notes?: string;
};

export type Assignment = {
  id: string;
  incidentId: string;
  resourceId: string;
  reason: string;
  etaMin: number;
  viaRoadIds: string[];
  status: "active" | "rerouted" | "cancelled";
  createdAt: number;
  updatedAt: number;
};

export type Hazard = {
  id: string;
  roadId: string;
  label: string;
  status: "open" | "blocked";
  verification: VerificationTag;
  updatedAt: number;
  sourceEventId: string;
};

export type InfraAsset = {
  id: string;
  name: string;
  kind: "road" | "bridge" | "flyover";
  roadId: string;
  damage: number;
  traffic: number;
  hospitalAccess: number;
  evacRoute: number;
  population: number;
  status: "open" | "damaged" | "blocked";
  rank: number;
  score: number;
  reason: string;
  consequences: string[];
  updatedAt: number;
  model?: string;
};

export type PrepRiskLevel = "high" | "elevated" | "watch";

export type PrepAssetKind = "school" | "hospital" | "elderly" | "road" | "substation" | "shelter";

export type PrepRisk = {
  wardId: string;
  wardName: string;
  level: PrepRiskLevel;
  horizonHours: number;
  blurb: string;
  drivers: string[];
};

export type PrepVulnerable = {
  kind: PrepAssetKind;
  name: string;
  wardId: string;
  why: string;
  action: string;
};

export type VulnerableMap = {
  headline: string;
  windowHours: number;
  sites: PrepVulnerable[];
  model?: string;
  fallback?: boolean;
};

export type PrepMove = {
  resourceId: string;
  callsign: string;
  fromId: string;
  toId: string;
  toLabel: string;
  why: string;
};

export type BeforeBrief = {
  headline: string;
  windowHours: number;
  orders: string;
  risks: PrepRisk[];
  vulnerable: PrepVulnerable[];
  moves: PrepMove[];
  model?: string;
  fallback?: boolean;
};

export type PrepSite = {
  id: string;
  label: string;
  why: string;
};

export type PrepositionPlan = {
  headline: string;
  orders: string;
  boats: number;
  medical: number;
  tankers: number;
  sites: PrepSite[];
  moves: PrepMove[];
  model?: string;
  fallback?: boolean;
};

export type Sitrep = {
  id: "current";
  generatedAt: number;
  activeIncidents: number;
  critical: number;
  high: number;
  roadsBlocked: number;
  freeUnits: number;
  assignedUnits: number;
  sheltersNearCapacity: number;
  predictedShortage: string;
  headline: string;
  predictions: string[];
  tick: number;
  model?: string;
  fallback?: boolean;
};

export type AgentLog = {
  id: string;
  agent: "intake" | "verification" | "prioritization" | "routing" | "summary";
  at: number;
  message: string;
  refId?: string;
};

export type DispatchCandidate = {
  resourceId: string;
  callsign: string;
  kind: ResourceKind;
  skills: string[];
  equipment: string[];
  status: ResourceStatus;
  locationId: string;
  etaMin: number;
  fit: number;
  danger: number;
  available: boolean;
  viaRoadIds: string[];
  blockedOnPath: string[];
};

export type SupportApplication = {
  id: string;
  kind: SupportKind;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  idNumber?: string;
  orgName?: string;
  registrationNo?: string;
  volunteerRole?: string;
  phone?: string;
  note?: string;
  photoDataUrl?: string;
  areaLabel?: string;
  lat?: number;
  lng?: number;
  status: ApplicationStatus;
  createdAt: number;
  decidedAt?: number;
  clerk?: {
    allow: boolean;
    summary: string;
    flags: string[];
    confidence: number;
    autoStamped?: boolean;
    model?: string;
  };
};

export type ApprovedSupport = {
  id: string;
  email: string;
  kind: SupportKind;
  name?: string;
  orgName?: string;
  areaLabel?: string;
  lat?: number;
  lng?: number;
};
