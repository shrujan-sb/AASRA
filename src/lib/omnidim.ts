function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim() && !/^not provided$/i.test(value.trim()) && value !== "undefined") {
      return value.trim();
    }
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function flatten(value: unknown, into: Record<string, unknown>, prefix = ""): void {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        flatten(JSON.parse(trimmed), into, prefix);
        return;
      } catch {
        /* plain string */
      }
    }
    if (prefix) into[prefix.toLowerCase()] = trimmed;
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => flatten(item, into, prefix ? `${prefix}_${i}` : String(i)));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      flatten(nested, into, prefix ? `${prefix}_${key}` : key);
    }
  }
}

function byKey(flat: Record<string, unknown>, ...keys: string[]): string {
  const want = keys.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const [raw, val] of Object.entries(flat)) {
    const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (want.includes(compact)) {
      const hit = pickString(val);
      if (hit) return hit;
    }
  }
  return "";
}

export type OmniCallIntake = {
  name: string;
  location: string;
  need: string;
  phone: string;
  callId: string;
  summary: string;
};

export function parseOmniCall(body: unknown): OmniCallIntake {
  const root = asRecord(body);
  const report = asRecord(root.call_report);
  const extracted = {
    ...asRecord(root.extracted_variables),
    ...asRecord(report.extracted_variables),
    ...asRecord(root.variables),
  };
  const flat: Record<string, unknown> = {};
  flatten(body, flat);

  const name = pickString(
    extracted.caller_name,
    extracted.name,
    extracted.full_name,
    root.name,
    root.caller_name,
    byKey(flat, "caller_name", "name", "full_name"),
  );
  const location = pickString(
    extracted.address,
    extracted.location,
    extracted.place,
    extracted.landmark,
    root.address,
    root.location,
    root.place,
    byKey(flat, "address", "location", "place", "landmark", "area"),
  );
  const need = pickString(
    extracted.need,
    extracted.requirement,
    extracted.help_needed,
    extracted.issue,
    root.need,
    root.requirement,
    typeof report.summary === "string" ? report.summary : "",
    root.summary,
    byKey(flat, "need", "requirement", "help_needed", "issue", "help", "request"),
  );
  const phone = pickString(
    extracted.phone,
    extracted.phone_number,
    root.phone_number,
    root.from_number,
    root.phone,
    byKey(flat, "phone", "phone_number", "from_number"),
  );
  const callId = pickString(root.call_id, root.callId, root.id, extracted.call_id, byKey(flat, "call_id", "callid", "id"));
  const summary = pickString(report.summary, root.summary, byKey(flat, "summary"));
  return { name, location, need, phone, callId, summary };
}
