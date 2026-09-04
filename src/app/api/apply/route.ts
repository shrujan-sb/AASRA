import { NextResponse } from "next/server";
import { clerkApplication } from "@/lib/featherless";
import { ADMIN_INBOX, sendAasraMail, SITE } from "@/lib/mail";
import { parseSupportKind, supportKindLabel } from "@/lib/supportKind";
import type { SupportApplication } from "@/lib/types";

async function finishApplication(row: SupportApplication, email: string) {
  const kindLabel = supportKindLabel(parseSupportKind(row.kind)).toLowerCase();
  const detail =
    row.kind === "government"
      ? `${row.designation}, ${row.department}. ID ${row.idNumber}.`
      : `${row.volunteerRole || ""} at ${row.orgName || "independent"}. Reg ${row.registrationNo}. ${row.phone}. ${row.note ?? ""}`;

  const clerk = await clerkApplication({ ...row, email });
  const application: SupportApplication = {
    ...row,
    email,
    clerk: clerk ?? undefined,
    status: clerk?.autoStamped ? "allowed" : "pending",
    decidedAt: clerk?.autoStamped ? Date.now() : row.decidedAt,
  };
  const forStore =
    (application.photoDataUrl?.length ?? 0) > 700000
      ? { ...application, photoDataUrl: undefined }
      : application;

  const rest = await import("@/lib/firestoreRest");
  const jobs = [rest.createFirestoreDoc("applications", row.id, forStore as unknown as Record<string, unknown>)];
  if (clerk?.autoStamped) {
    jobs.push(
      rest.createFirestoreDoc("approvedSupport", email, {
        email,
        kind: parseSupportKind(row.kind),
        name: row.name,
        orgName: row.orgName || row.department || row.name,
        areaLabel: row.areaLabel,
        lat: row.lat,
        lng: row.lng,
      }),
    );
  }
  await Promise.all(jobs);

  await sendAasraMail(ADMIN_INBOX, `Chit in — ${row.name} wants the ${kindLabel} desk`, {
    kicker: "Incoming verification",
    title: clerk?.autoStamped ? "Clerk stamped this file." : "Someone is waiting on the bench.",
    stamp: clerk?.autoStamped ? "Pass" : "Hold",
    meta: [
      { label: "Name", value: row.name },
      { label: "Track", value: kindLabel },
      { label: "Gmail", value: email },
      { label: "File", value: detail },
      { label: "Area", value: row.areaLabel || "not given" },
      { label: "Clerk", value: clerk ? `${clerk.allow ? "allow" : "hold"} · ${Math.round(clerk.confidence * 100)}%` : "offline" },
    ],
    body: `<p style="margin:0;">${clerk?.summary || "Clerk did not return a ruling. Open Approvals and look at the ID."}</p>`,
    actionLabel: "Open Approvals",
    actionHref: `${SITE}/console/approvals`,
  });
  if (clerk?.autoStamped) {
    await sendAasraMail(email, "Aasra: your desk pass is stamped", {
      kicker: "Verification passed",
      title: "The stamp is dry. Come in.",
      greeting: `Dear ${row.name},`,
      stamp: "Pass",
      meta: [
        { label: "Track", value: kindLabel },
        { label: "Gmail", value: email },
      ],
      body: `<p style="margin:0 0 12px;">The duty clerk read your file and allowed this Gmail onto the ${kindLabel} desk.</p>
             <p style="margin:0;">Open Support team → <strong>I am already approved — sign in</strong>. Use this same Gmail.</p>`,
      actionLabel: "Sign in to the desk",
      actionHref: `${SITE}/join`,
    });
  } else {
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
             <p style="margin:0;">The next letter to this Gmail is the decision.</p>`,
      actionLabel: "Aasra home",
      actionHref: SITE,
    });
  }
}

export async function POST(req: Request) {
  const row = (await req.json()) as SupportApplication;
  if (!row?.id || !row.email || !row.name || !row.kind) {
    return NextResponse.json({ ok: false, error: "Missing application fields." }, { status: 400 });
  }
  const email = row.email.trim().toLowerCase();
  const application: SupportApplication = {
    ...row,
    email,
    kind: parseSupportKind(row.kind),
    status: "pending",
  };

  void import("@/lib/firestoreRest").then((m) =>
    m.createFirestoreDoc(
      "applications",
      row.id,
      ((application.photoDataUrl?.length ?? 0) > 700000
        ? { ...application, photoDataUrl: undefined }
        : application) as unknown as Record<string, unknown>,
    ),
  );
  void finishApplication(row, email).catch(() => undefined);

  return NextResponse.json({ ok: true, mailed: true, queued: true, application });
}