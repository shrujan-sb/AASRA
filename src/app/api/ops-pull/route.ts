import { NextResponse } from "next/server";
import { listFirestoreCol } from "@/lib/firestoreRest";

export const dynamic = "force-dynamic";

export async function GET() {
  const [incidents, events, inbox] = await Promise.all([
    listFirestoreCol("incidents"),
    listFirestoreCol("events"),
    listFirestoreCol("inbox"),
  ]);
  return NextResponse.json({ ok: true, incidents, events, inbox });
}
