export const AASRA_CALL_NUMBER =
  process.env.NEXT_PUBLIC_AASRA_CALL_NUMBER?.trim() || "+918048799075";

export function callHref(): string {
  return `tel:${AASRA_CALL_NUMBER.replace(/\s/g, "")}`;
}

export function callDisplay(): string {
  const n = AASRA_CALL_NUMBER.replace(/\s/g, "");
  if (n.startsWith("+91") && n.length === 13) {
    return `${n.slice(0, 3)} ${n.slice(3, 8)} ${n.slice(8)}`;
  }
  return n;
}
