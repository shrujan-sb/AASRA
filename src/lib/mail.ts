import nodemailer from "nodemailer";

const ADMIN_INBOX = process.env.NOTIFY_EMAIL || "aasra.support@gmail.com";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://aasra.vercel.app").replace(/\/$/, "");
const LOGO = `${SITE}/brand/mark.png`;

export type DeskLetter = {
  kicker: string;
  title: string;
  greeting?: string;
  body: string;
  meta?: { label: string; value: string }[];
  stamp: string;
  actionLabel?: string;
  actionHref?: string;
  footnote?: string;
};

function chitNo(): string {
  const n = Date.now().toString(36).slice(-6).toUpperCase();
  return `AAS-${n}`;
}

function deskWhen(): string {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function wrap(letter: DeskLetter): string {
  const no = chitNo();
  const when = deskWhen();
  const metaRows = (letter.meta ?? [])
    .map(
      (m) => `<tr>
        <td style="padding:7px 0;border-bottom:1px solid #e6e0d6;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6a6158;width:34%;">${m.label}</td>
        <td style="padding:7px 0;border-bottom:1px solid #e6e0d6;font-size:15px;color:#1c1612;">${m.value}</td>
      </tr>`,
    )
    .join("");

  const action = letter.actionHref
    ? `<table cellpadding="0" cellspacing="0" style="margin-top:22px;">
        <tr>
          <td style="background:#1c1612;">
            <a href="${letter.actionHref}" style="display:inline-block;padding:12px 22px;font-family:Georgia,'Times New Roman',serif;font-size:14px;letter-spacing:0.04em;color:#efe6d6;text-decoration:none;">${letter.actionLabel ?? "Open Aasra"} →</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${letter.title}</title>
</head>
<body style="margin:0;padding:0;background:#d9d1c3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#d9d1c3;padding:28px 12px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#efe6d6;border:1px solid #1c1612;">
          <tr>
            <td style="width:10px;background:#c42718;font-size:0;line-height:0;">&nbsp;</td>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:18px 24px 12px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle">
                          <img src="${LOGO}" alt="" width="40" height="40" style="display:block;border:0;" />
                        </td>
                        <td valign="middle" align="right" style="font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#6a6158;">
                          Desk chit ${no}<br/>${when} IST
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#c42718;">${letter.kicker}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 4px 24px;">
                    <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:normal;color:#1c1612;">${letter.title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 24px 0 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0"><tr>
                      <td style="border-top:1px dashed #1c1612;font-size:0;line-height:0;height:8px;">&nbsp;</td>
                    </tr></table>
                  </td>
                </tr>
                ${
                  metaRows
                    ? `<tr><td style="padding:4px 24px 0 24px;"><table width="100%" cellpadding="0" cellspacing="0">${metaRows}</table></td></tr>`
                    : ""
                }
                <tr>
                  <td style="padding:18px 24px 8px 24px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#1c1612;">
                    ${letter.greeting ? `<p style="margin:0 0 12px;">${letter.greeting}</p>` : ""}
                    ${letter.body}
                    ${action}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="bottom" style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#6a6158;">
                          Filed by the night clerk<br/>Aasra ReliefMesh
                        </td>
                        <td valign="bottom" align="right">
                          <div style="display:inline-block;padding:8px 10px;border:2px solid #c42718;color:#c42718;font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;transform:rotate(-6deg);">
                            ${letter.stamp}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background:#1c1612;padding:10px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#efe6d6;">Prepare</td>
                        <td align="center" style="font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#efe6d6;">Respond</td>
                        <td align="right" style="font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#efe6d6;">Rebuild</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 24px 16px 24px;font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#6a6158;">
                    ${letter.footnote ?? "This is a desk notice, not a marketing letter. Call 112 / 108 if someone is in danger."}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendAasraMail(
  to: string,
  subject: string,
  letter: DeskLetter,
): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return false;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: `"Aasra Desk" <${user}>`,
    to,
    subject,
    html: wrap(letter),
    text: `${letter.title}\n\n${letter.greeting ?? ""}\n${letter.body.replace(/<[^>]+>/g, " ")}\n\n${letter.actionHref ?? SITE}`,
  });
  return true;
}

export { ADMIN_INBOX, SITE };
