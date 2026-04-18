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
    });
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
  }
}
