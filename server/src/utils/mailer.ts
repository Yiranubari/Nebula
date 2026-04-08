import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.warn("SMTP credentials not provided. Mocking email send:");
    console.log(`To: ${to}\nSubject: ${subject}\nBody: ${text}`);
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
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
