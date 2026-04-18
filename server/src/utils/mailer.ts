import path from "node:path";
import fs from "node:fs";
import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../config/logger";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Logo attachment embedded via CID so the email renders the actual Nebula
 * mark in every client (Gmail, Apple Mail, Outlook, …) instead of relying on
 * inline SVG support. The PNG is rendered from the canonical SVG via
 * rsvg-convert — see `server/src/assets/logo.png`.
 */
export const LOGO_CID = "nebula-logo";
const logoPath = path.resolve(__dirname, "..", "assets", "logo.png");
let logoBuffer: Buffer | null = null;
try {
  logoBuffer = fs.readFileSync(logoPath);
} catch (err) {
  logger.warn({ err, logoPath }, "Could not load email logo asset");
}

export async function sendMail(
  to: string,
  subject: string,
  text: string,
  html?: string
) {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    // Development fallback: log the subject only. Do NOT log the body or
    // OTP contents — those are sensitive and would leak into prod log sinks
    // if this ever runs with verbose logging enabled.
    logger.warn(
      { to, subject },
      "SMTP credentials not configured — email send skipped"
    );
    return;
  }

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
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
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
  }
}
