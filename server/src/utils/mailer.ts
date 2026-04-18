import path from "node:path";
import fs from "node:fs";
import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../config/logger";

/**
 * Logo PNG embedded in every outgoing email via Content-ID so the mark
 * renders in every mainstream client (Gmail, Apple Mail, Outlook, …).
 * The PNG is generated from `frontend/public/logo.svg` by `rsvg-convert`;
 * see `server/src/assets/logo.png`.
 */
export const LOGO_CID = "nebula-logo";
const logoPath = path.resolve(__dirname, "..", "assets", "logo.png");
let logoBuffer: Buffer | null = null;
try {
  logoBuffer = fs.readFileSync(logoPath);
} catch (err) {
  logger.warn({ err, logoPath }, "Could not load email logo asset");
}

// ─── Transports ─────────────────────────────────────────────────────────────

const smtpTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

function fromAddress(): string {
  return env.EMAIL_FROM || env.SMTP_FROM || "Nebula <noreply@nebula.com>";
}

// ─── Resend (HTTP API) ──────────────────────────────────────────────────────

/**
 * Send via Resend's HTTP API. Used in production on hosts that block
 * outbound SMTP (Render, Vercel, etc.). Resend's free tier (3k/month, no
 * card) is plenty for auth flows.
 *
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */
async function sendViaResend(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<void> {
  const payload: Record<string, unknown> = {
    from: fromAddress(),
    to: [to],
    subject,
    text,
    ...(html ? { html } : {}),
    ...(logoBuffer
      ? {
          attachments: [
            {
              filename: "nebula.png",
              content: logoBuffer.toString("base64"),
              content_id: LOGO_CID,
              content_type: "image/png",
            },
          ],
        }
      : {}),
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Resend API ${res.status} ${res.statusText}${body ? `: ${body}` : ""}`
    );
  }
}

// ─── SMTP (local dev fallback) ──────────────────────────────────────────────

async function sendViaSmtp(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<void> {
  await smtpTransporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html,
    attachments: logoBuffer
      ? [
          {
            filename: "nebula.png",
            content: logoBuffer,
            cid: LOGO_CID,
            contentDisposition: "inline",
          },
        ]
      : undefined,
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function sendMail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<void> {
  const useResend = !!env.RESEND_API_KEY;
  const useSmtp = !useResend && !!env.SMTP_USER && !!env.SMTP_PASS;

  if (!useResend && !useSmtp) {
    logger.warn(
      { to, subject },
      "No email provider configured (RESEND_API_KEY or SMTP_USER/SMTP_PASS) — skipping send"
    );
    return;
  }

  try {
    if (useResend) {
      await sendViaResend(to, subject, text, html);
    } else {
      await sendViaSmtp(to, subject, text, html);
    }
  } catch (err) {
    logger.error(
      { err, to, subject, provider: useResend ? "resend" : "smtp" },
      "Failed to send email"
    );
  }
}
