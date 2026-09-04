import { NextResponse } from "next/server";
import { ADMIN_INBOX, sendAasraMail, SITE } from "@/lib/mail";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    type: "application" | "decision";
    kind?: string;
    name?: string;
    email?: string;
    detail?: string;
    allowed?: boolean;
  };

  try {
    if (body.type === "application") {
      const sent = await sendAasraMail(ADMIN_INBOX, `Chit in — ${body.name} wants the ${body.kind} desk`, {
        kicker: "Incoming verification",
        title: "Someone is waiting on the bench.",
        stamp: "Hold",
        meta: [
          { label: "Name", value: body.name ?? "—" },
          { label: "Track", value: body.kind ?? "—" },
          { label: "Gmail", value: body.email ?? "—" },
          { label: "File", value: body.detail ?? "—" },
        ],
        body: `<p style="margin:0;">Open Approvals. Pass or hold. Do not leave this on the spike.</p>`,
        actionLabel: "Open Approvals",
        actionHref: `${SITE}/console/approvals`,
      });
      if (body.email) {
        await sendAasraMail(body.email, `Aasra filed your ${body.kind} chit`, {
          kicker: "Public intake",
          title: "We have your papers. Sit tight.",
          greeting: `Dear ${body.name},`,
          stamp: "Received",
          meta: [{ label: "Filed as", value: body.kind ?? "—" }],
          body: `<p style="margin:0;">The next letter to this Gmail is the decision.</p>`,
          actionHref: SITE,
          actionLabel: "Aasra home",
        });
      }
      return NextResponse.json({ ok: true, mailed: sent });
    }

    if (body.type === "decision" && body.email) {
      const allowed = Boolean(body.allowed);
      await sendAasraMail(
        body.email,
        allowed ? "Aasra: your desk pass is stamped" : "Aasra: the desk could not pass you",
        allowed
          ? {
              kicker: "Verification passed",
              title: "The stamp is dry. Come in.",
              greeting: `Dear ${body.name ?? ""},`,
              stamp: "Pass",
              body: `<p style="margin:0;">Open Support team → I am already approved — sign in. Same Gmail.</p>`,
              actionLabel: "Sign in to the desk",
              actionHref: `${SITE}/join`,
            }
          : {
              kicker: "Verification held",
              title: "The desk could not pass these papers.",
              greeting: `Dear ${body.name ?? ""},`,
              stamp: "Hold",
              body: `<p style="margin:0;">File again from the join page with a clearer card.</p>`,
              actionLabel: "File again",
              actionHref: `${SITE}/join`,
            },
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "mail failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
