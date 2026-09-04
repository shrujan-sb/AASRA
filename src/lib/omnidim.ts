function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim() && !/^not provided$/i.test(value.trim())) {
      return value.trim();
    }
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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
  const name = pickString(
    extracted.caller_name,
    extracted.name,
    extracted.full_name,
    root.name,
    root.caller_name,
  );
  const location = pickString(
    extracted.address,
    extracted.location,
    extracted.place,
    extracted.landmark,
    root.address,
    root.location,
  );
  const need = pickString(
    extracted.need,
    extracted.requirement,
    extracted.help_needed,
    extracted.issue,
    root.need,
    root.requirement,
    typeof report.summary === "string" ? report.summary : "",
  );
  const phone = pickString(
    extracted.phone,
    extracted.phone_number,
    root.phone_number,
    root.from_number,
    root.phone,
  );
  const callId = pickString(root.call_id, root.callId, root.id, extracted.call_id);
  const summary = pickString(report.summary, root.summary);
  return { name, location, need, phone, callId, summary };
}
