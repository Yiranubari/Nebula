
export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const BG = "#0b1120";
const TEXT = "#cbd5e1";
const MUTED = "#64748b";
const HEADING = "#ffffff";
const ACCENT_BG = "#ffffff";
const ACCENT_TEXT = "#0b1120";
const CODE_BG = "rgba(255,255,255,0.04)";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif";

const LOGO_CID = "nebula-logo";

interface LayoutArgs {
  preview: string;
  title: string;
  intro: string;
  bodyHtml: string;
  footerNote?: string;
}

function layout({ preview, title, intro, bodyHtml, footerNote }: LayoutArgs): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:${FONT};color:${TEXT};-webkit-font-smoothing:antialiased;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
    ${preview}
  </span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG};">
    <tr>
      <td align="center" style="padding:72px 16px 48px;">

        <!-- Logo -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-bottom:44px;">
              <img
                src="cid:${LOGO_CID}"
                alt="Nebula"
                width="48"
                height="48"
                style="display:block;width:48px;height:48px;border:0;outline:none;"
              />
            </td>
          </tr>
        </table>

        <!-- Title -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding:0 8px;">
              <h1 style="
                margin:0;
                font-family:${FONT};
                font-size:34px;line-height:1.15;
                font-weight:600;letter-spacing:-0.02em;
                color:${HEADING};
              ">${title}</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 8px 0;">
              <p style="
                margin:0;
                font-family:${FONT};
                font-size:15px;line-height:1.6;
                color:${TEXT};font-weight:400;
                max-width:420px;
              ">${intro}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:40px 0 0;">
              ${bodyHtml}
            </td>
          </tr>
          ${
            footerNote
              ? `<tr>
                  <td align="center" style="padding:32px 8px 0;">
                    <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">${footerNote}</p>
                  </td>
                </tr>`
              : ""
          }
        </table>

        <!-- Footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;margin-top:80px;">
          <tr>
            <td align="center" style="padding:0 8px;">
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.8;color:${MUTED};letter-spacing:0.01em;">
                Nebula · The workspace for visionary teams
              </p>
              <p style="margin:4px 0 0 0;font-family:${FONT};font-size:12px;line-height:1.8;color:${MUTED};">
                &copy; ${year} Nebula
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function otpCodeBlock(otp: string, minutes = 15): string {
  const spaced = otp.split("").join(" ");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="
          padding:22px 34px;
          background:${CODE_BG};
          border-radius:14px;
        ">
          <div style="
            font-family:${FONT};
            font-size:10px;letter-spacing:2.5px;text-transform:uppercase;
            color:${MUTED};font-weight:600;margin-bottom:10px;
          ">Verification code</div>
          <div style="
            font-family:'SF Mono','Menlo','Consolas','Liberation Mono',monospace;
            font-size:30px;font-weight:600;color:${HEADING};letter-spacing:8px;
          ">${spaced}</div>
          <div style="
            margin-top:10px;font-family:${FONT};font-size:12px;color:${MUTED};
          ">Expires in ${minutes} minutes</div>
        </td>
      </tr>
    </table>
  `;
}

function pillButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="border-radius:999px;background:${ACCENT_BG};">
          <a href="${href}" target="_blank" rel="noopener" style="
            display:inline-block;
            padding:14px 28px;
            font-family:${FONT};
            font-size:14px;font-weight:600;
            color:${ACCENT_TEXT};text-decoration:none;
            border-radius:999px;
            letter-spacing:-0.005em;
          ">${label}</a>
        </td>
      </tr>
    </table>
  `;
}

export function verifyOtpEmail(otp: string): EmailContent {
  const subject = "Verify your Nebula account";
  const text =
    `Welcome to Nebula.\n\n` +
    `Your verification code is: ${otp}\n` +
    `It expires in 15 minutes.\n\n` +
    `If you didn't sign up for Nebula, you can ignore this email.`;

  const html = layout({
    preview: `Your Nebula verification code is ${otp}.`,
    title: "Verify your email",
    intro:
      "Enter the code below to activate your Nebula account.",
    bodyHtml: otpCodeBlock(otp),
    footerNote:
      "Didn't sign up? You can safely ignore this message.",
  });

  return { subject, text, html };
}

export function resendOtpEmail(otp: string): EmailContent {
  const subject = "Your new Nebula verification code";
  const text =
    `Here's your fresh Nebula verification code: ${otp}\n` +
    `It expires in 15 minutes.\n\n` +
    `The previous code you were sent is no longer valid.`;

  const html = layout({
    preview: `New Nebula verification code: ${otp}.`,
    title: "A fresh code",
    intro:
      "Use this new verification code. The previous one is no longer valid.",
    bodyHtml: otpCodeBlock(otp),
    footerNote:
      "Didn't request this? No action is needed.",
  });

  return { subject, text, html };
}

export function inviteEmail(args: {
  otp: string;
  inviterName?: string;
  workspaceName?: string;
  completeUrl: string;
}): EmailContent {
  const { otp, inviterName, workspaceName, completeUrl } = args;
  const inviter = inviterName || "An admin";
  const workspace = workspaceName?.trim() || "a Nebula workspace";

  const subject = `You've been invited to join ${workspace} on Nebula`;
  const text =
    `${inviter} has invited you to join ${workspace} on Nebula.\n\n` +
    `Open the invitation page: ${completeUrl}\n` +
    `Your verification code: ${otp}\n` +
    `The code expires in 15 minutes.`;

  const html = layout({
    preview: `${inviter} invited you to ${workspace} on Nebula.`,
    title: `Join ${workspace} on Nebula`,
    intro: `${inviter} invited you to join <strong>${workspace}</strong>. Accept the invitation to set your name and password.`,
    bodyHtml:
      pillButton(completeUrl, "Accept invitation") +
      `<div style="height:28px;line-height:28px;">&nbsp;</div>` +
      otpCodeBlock(otp),
    footerNote:
      "Didn't expect this? You can safely ignore this email.",
  });

  return { subject, text, html };
}

export function passwordResetEmail(otp: string): EmailContent {
  const subject = "Reset your Nebula password";
  const text =
    `We received a request to reset your Nebula password.\n\n` +
    `Your reset code is: ${otp}\n` +
    `It expires in 15 minutes.\n\n` +
    `If you didn't ask to reset your password, ignore this email.`;

  const html = layout({
    preview: `Your Nebula password reset code is ${otp}.`,
    title: "Reset your password",
    intro:
      "Enter this code in the app to set a new password for your Nebula account.",
    bodyHtml: otpCodeBlock(otp),
    footerNote:
      "Didn't request this? Your password stays the same, so you can ignore this email.",
  });

  return { subject, text, html };
}
