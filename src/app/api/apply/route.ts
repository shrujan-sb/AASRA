import { NextResponse } from "next/server";
import { ADMIN_INBOX, sendAasraMail, SITE } from "@/lib/mail";
import type { SupportApplication } from "@/lib/types";

export async function POST(req: Request) {
  const row = (await req.json()) as SupportApplication;
  if (!row?.id || !row.email || !row.name || !row.kind) {
    return NextResponse.json({ ok: false, error: "Missing application fields." }, { status: 400 });
  }
  const email = row.email.trim().toLowerCase();
  const kindLabel = row.kind === "government" ? "government official" : "NGO / volunteer";
  const detail =
    row.kind === "government"
      ? `${row.designation}, ${row.department}. ID ${row.idNumber}.`
      : `${row.volunteerRole} at ${row.orgName}. Reg ${row.registrationNo}. ${row.phone}. ${row.note ?? ""}`;

  void import("@/lib/firestoreRest").then((m) => {
    const forStore =
      (row.photoDataUrl?.length ?? 0) > 700000 ? { ...row, email, photoDataUrl: undefined } : { ...row, email };
    return m.createFirestoreDoc("applications", row.id, forStore as unknown as Record<string, unknown>);
  });

  try {
    await sendAasraMail(ADMIN_INBOX, `Chit in — ${row.name} wants the ${kindLabel} desk`, {
      kicker: "Incoming verification",
      title: "Someone is waiting on the bench.",
      stamp: "Hold",
      meta: [
        { label: "Name", value: row.name },
        { label: "Track", value: kindLabel },
        { label: "Gmail", value: email },
        { label: "File", value: detail },
        { label: "Area", value: row.areaLabel || "not given" },
      ],
      body: `<p style="margin:0;">Do not let this sit overnight. Open Approvals, look at the ID, then pass or hold the person.</p>`,
      actionLabel: "Open Approvals",
      actionHref: `${SITE}/console/approvals`,
    });
    await sendAasraMail(email, `Aasra filed your ${kindLabel} chit`, {
      kicker: "Public intake",
      title: "We have your papers. Sit tight.",
      greeting: `Dear ${row.name},`,
      stamp: "Received",
      meta: [
        { label: "Filed as", value: kindLabel },
        { label: "Will write to", value: email },
      ],
      body: `<p style="margin:0 0 12px;">The desk logged your ID. An officer will allow or reject. Until then the support door stays shut — do not try to sign in.</p>
             <p style="margin:0;">The next letter to this Gmail is the decision. Not a reminder. Not a newsletter.</p>`,
      actionLabel: "Aasra home",
      actionHref: SITE,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "mail failed";
    return NextResponse.json({ ok: true, mailed: false, error: message, application: { ...row, email } });
  }

  return NextResponse.json({ ok: true, mailed: true, application: { ...row, email } });
}
