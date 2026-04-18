/**
 * Branded HTML email templates that match the Nebula app aesthetic.
 *
 * Uses:
 *   - Inline styles (Outlook and other stricter clients strip <style>).
 *   - Table-based outer layout for Outlook desktop compatibility.
 *   - Pure CSS / HTML for the logo so there are no broken-image fallbacks.
 *   - Gmail / Apple Mail / Outlook 365 dark-friendly palette throughout.
 *
 * Every template returns `{ subject, text, html }` that `sendMail` can pass
 * straight to Nodemailer.
 */

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

// ─── Shared layout ───────────────────────────────────────────────────────────

interface LayoutArgs {
  preview: string; // inbox preview snippet (pre-header)
  title: string; // main H1 rendered in the card
  intro: string; // paragraph above the code/button
  /**
   * The key "call to action" block — pass ready-to-embed HTML. Typically
   * `otpCodeBlock(...)` or a button row.
   */
  bodyHtml: string;
  footerNote?: string; // optional smaller note under the CTA
}

const BG = "#0b1120"; // app dark background
const CARD = "#0f172a"; // app surface
const CARD_BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#e2e8f0";
const MUTED = "#94a3b8";
const HEADING = "#ffffff";
const ACCENT = "#818cf8";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif";

/**
 * The Nebula mark in email headers. Referenced via `cid:` so the PNG is
 * attached to the email as an inline resource — this renders identically
 * in Gmail, Apple Mail, Outlook (all versions), iOS Mail, Yahoo, and every
 * other mainstream client. See `mailer.ts` for the attachment wiring.
 */
const LOGO_CID = "nebula-logo";
const logoHtml = `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding-right:12px;vertical-align:middle;">
        <img
          src="cid:${LOGO_CID}"
          alt="Nebula"
          width="36"
          height="36"
          style="display:block;width:36px;height:36px;border:0;outline:none;"
        />
      </td>
      <td style="vertical-align:middle;">
        <span style="
          font-family:${FONT};
          font-weight:700;font-size:19px;letter-spacing:-0.02em;
          color:#ffffff;
        ">Nebula</span>
      </td>
    </tr>
  </table>
`;

function layout({ preview, title, intro, bodyHtml, footerNote }: LayoutArgs): string {
  // Escape is intentional: callers pass trusted literals. The `preview` span
  // below is an old-school "pre-header" — hidden in the email body, visible
  // in the inbox list.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:${FONT};color:${TEXT};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
    ${preview}
  </span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:${CARD};border:1px solid ${CARD_BORDER};border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:22px 24px;border-bottom:1px solid ${CARD_BORDER};">
              ${logoHtml}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 24px 12px;">
              <h1 style="margin:0 0 14px 0;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:700;color:${HEADING};letter-spacing:-0.02em;">${title}</h1>
              <p style="margin:0 0 20px 0;font-family:${FONT};font-size:15px;line-height:1.65;color:${TEXT};">${intro}</p>
              ${bodyHtml}
              ${
                footerNote
                  ? `<p style="margin:20px 0 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">${footerNote}</p>`
                  : ""
              }
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:22px 24px;border-top:1px solid ${CARD_BORDER};text-align:center;">
              <p style="margin:0;font-family:${FONT};font-size:12px;color:${MUTED};line-height:1.6;">
                You're receiving this message because an account at Nebula is using your email address. If that wasn't you, you can safely ignore this email.
              </p>
              <p style="margin:8px 0 0 0;font-family:${FONT};font-size:11px;color:${MUTED};letter-spacing:0.02em;">
                &copy; ${new Date().getFullYear()} Nebula · The workspace for visionary teams
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

// ─── Shared pieces ───────────────────────────────────────────────────────────

function otpCodeBlock(otp: string, minutes = 15): string {
  const spaced = otp.split("").join(" ");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="
          padding:22px 16px;
          background:rgba(99,102,241,0.08);
          border:1px solid rgba(99,102,241,0.35);
          border-radius:14px;
          text-align:center;
        ">
          <div style="
            font-family:${FONT};
            font-size:11px;letter-spacing:3px;text-transform:uppercase;
            color:${ACCENT};font-weight:600;margin-bottom:10px;
          ">Your verification code</div>
          <div style="
            font-family:'SF Mono','Menlo','Consolas','Liberation Mono',monospace;
            font-size:32px;font-weight:700;color:${HEADING};letter-spacing:8px;
          ">${spaced}</div>
          <div style="
            margin-top:10px;font-family:${FONT};font-size:12px;color:${MUTED};
          ">Expires in ${minutes} minutes</div>
        </td>
      </tr>
    </table>
  `;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function verifyOtpEmail(otp: string): EmailContent {
  const subject = "Verify your Nebula account";
  const text =
    `Welcome to Nebula.\n\n` +
    `Your verification code is: ${otp}\n` +
    `It expires in 15 minutes.\n\n` +
    `If you didn't sign up for Nebula, you can ignore this email.`;

  const html = layout({
    preview: `Your Nebula verification code is ${otp}.`,
    title: "Welcome to Nebula",
    intro:
      "Thanks for joining — you're one step away. Enter the code below to verify your email address and activate your account.",
    bodyHtml: otpCodeBlock(otp),
    footerNote:
      "If you didn't try to sign up, no account was created — you can safely ignore this message.",
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
    title: "Here's a fresh code",
    intro:
      "You asked for a new verification code. The previous one is no longer valid — use this one to verify your email.",
    bodyHtml: otpCodeBlock(otp),
    footerNote:
      "Didn't request this code? Someone may have mistyped your email — no action is needed.",
  });

  return { subject, text, html };
}

export function inviteEmail(args: {
  otp: string;
  inviterName?: string;
  completeUrl: string;
}): EmailContent {
  const { otp, inviterName, completeUrl } = args;
  const inviter = inviterName || "An admin";
  const subject = `${inviter} invited you to Nebula`;
  const text =
    `${inviter} has invited you to join Nebula.\n\n` +
    `Use this code to finish setting up your account: ${otp}\n` +
    `The code expires in 15 minutes.\n\n` +
    `Complete your invitation: ${completeUrl}`;

  const button = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0 0;">
      <tr>
        <td style="
          border-radius:999px;
          background:#6366f1;
          background-image:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);
          box-shadow:0 8px 24px rgba(99,102,241,0.45);
        ">
          <a href="${completeUrl}" style="
            display:inline-block;
            padding:12px 22px;
            font-family:${FONT};
            font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;
            border-radius:999px;
          ">Complete your invitation &rarr;</a>
        </td>
      </tr>
    </table>
  `;

  const html = layout({
    preview: `${inviter} invited you to Nebula.`,
    title: `You've been invited to Nebula`,
    intro: `${inviter} added you to their workspace. Enter the code below on the invitation page to finish setting up your account. You'll set your name and password there — no need to create one first.`,
    bodyHtml: otpCodeBlock(otp) + button,
    footerNote:
      "If you didn't expect this invitation, you can safely ignore this email — no account was created until you complete the steps above.",
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
      "Someone — hopefully you — asked to reset the password on your Nebula account. Enter this code in the app to finish resetting it.",
    bodyHtml: otpCodeBlock(otp),
    footerNote:
      "Didn't request a password reset? You can ignore this email and your password will stay the same.",
  });

  return { subject, text, html };
}
