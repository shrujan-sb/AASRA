import type { SupportKind } from "@/lib/types";

export const SUPPORT_KINDS: SupportKind[] = ["government", "ngo", "volunteer"];

export function parseSupportKind(value: unknown): SupportKind {
  if (value === "government" || value === "ngo" || value === "volunteer") return value;
  return "ngo";
}

export function supportKindLabel(kind: SupportKind): string {
  if (kind === "government") return "Government";
  if (kind === "volunteer") return "Volunteer";
  return "NGO";
}

export function supportDeskTitle(kind: SupportKind): string {
  if (kind === "government") return "Government desk";
  if (kind === "volunteer") return "Volunteer desk";
  return "NGO desk";
}

export function supportDeskPath(kind: SupportKind): string {
  return `/support/${kind}`;
}

export function supportOrgFallback(kind: SupportKind): string {
  if (kind === "government") return "Government";
  if (kind === "volunteer") return "Volunteer";
  return "NGO";
}
