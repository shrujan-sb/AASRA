import { NextResponse } from "next/server";
import { sendAasraMail, SITE } from "@/lib/mail";
import { parseSupportKind, supportKindLabel } from "@/lib/supportKind";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    email?: string;
    name?: string;
    kind?: string;
    allowed?: boolean;
    orgName?: string;
    areaLabel?: string;
    lat?: number;
    lng?: number;
  };
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const kind = String(body.kind ?? "support");
  if (!email) return NextResponse.json({ ok: false, error: "No applicant email." }, { status: 400 });

  const allowed = Boolean(body.allowed);
  const kindLabel = supportKindLabel(parseSupportKind(kind)).toLowerCase();

  try {
    const mailed = await sendAasraMail(
      email,
      allowed ? "Aasra: your desk pass is stamped" : "Aasra: the desk could not pass you",
      allowed
        ? {
            kicker: "Verification passed",
            title: "The stamp is dry. Come in.",
            greeting: `Dear ${name || "applicant"},`,
            stamp: "Pass",
            meta: [
              { label: "Track", value: kindLabel },
              { label: "Gmail", value: email },
            ],
            body: `<p style="margin:0 0 12px;">An Aasra admin read your papers and allowed this address onto the support desk.</p>
                   <p style="margin:0;">Open Support team → <strong>I am already approved — sign in</strong>. Use this same Gmail. No other door works.</p>`,
            actionLabel: "Sign in to the desk",
            actionHref: `${SITE}/join`,
          }
        : {
            kicker: "Verification held",
            title: "The desk could not pass these papers.",
            greeting: `Dear ${name || "applicant"},`,
            stamp: "Hold",
            meta: [
              { label: "Track", value: kindLabel },
              { label: "Gmail", value: email },
            ],
            body: `<p style="margin:0 0 12px;">An Aasra admin could not approve this ${kindLabel} file. The photo or the details were not enough to put you in the field.</p>
                   <p style="margin:0;">You may file again from the join page with a clearer card and the same Gmail.</p>`,
            actionLabel: "File again",
            actionHref: `${SITE}/join`,
          },
    );
    if (allowed) {
      void import("@/lib/firestoreRest").then((m) =>
        m.createFirestoreDoc("approvedSupport", email, {
          email,
          kind: parseSupportKind(kind),
          name,
          orgName: body.orgName || name,
          areaLabel: body.areaLabel,
          lat: typeof body.lat === "number" ? body.lat : undefined,
          lng: typeof body.lng === "number" ? body.lng : undefined,
        }),
      );
    }
    return NextResponse.json({ ok: true, mailed, to: email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "mail failed";
    return NextResponse.json({ ok: false, error: message, to: email }, { status: 500 });
  }
}
