import { NextResponse } from "next/server";
import { isSeedAdmin, normEmail } from "@/lib/adminEmails";
import { createFirestoreDoc, getFirestoreDoc, listFirestoreCol } from "@/lib/firestoreRest";

async function emailIsAdmin(raw: string): Promise<boolean> {
  const email = normEmail(raw);
  if (!email.includes("@")) return false;
  if (isSeedAdmin(email)) return true;
  const direct = await getFirestoreDoc("admins", email);
  if (direct) return true;
  const rows = await listFirestoreCol("admins");
  return rows.some((row) => normEmail(String(row.email ?? row.id ?? "")) === email);
}

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email") ?? "";
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, admin: false }, { status: 400 });
  }
  const admin = await emailIsAdmin(email);
  return NextResponse.json({ ok: true, admin });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = normEmail(body?.email ?? "");
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Enter a valid email" }, { status: 400 });
  }
  const written = await createFirestoreDoc("admins", email, { email });
  return NextResponse.json({ ok: written, admin: true, email });
}
