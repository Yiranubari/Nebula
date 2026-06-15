import { cleanEnv, port, str } from "envalid";

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development",
  }),
  PORT: port({ default: 4000 }),
  DATABASE_URL: str(),
  DIRECT_URL: str({ default: "" }),
  JWT_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  JWT_EXPIRES_IN: str({ default: "15m" }),
  JWT_REFRESH_EXPIRES_IN: str({ default: "7d" }),
  CLOUDINARY_CLOUD_NAME: str({ default: "" }),
  CLOUDINARY_API_KEY: str({ default: "" }),
  CLOUDINARY_API_SECRET: str({ default: "" }),
  CLIENT_URL: str({ default: "http://localhost:3000" }),
  SMTP_HOST: str({ default: "smtp.mailtrap.io" }),
  SMTP_PORT: port({ default: 2525 }),
  SMTP_USER: str({ default: "" }),
  SMTP_PASS: str({ default: "" }),
  SMTP_FROM: str({ default: "noreply@nebula.com" }),
  RESEND_API_KEY: str({ default: "" }),
  EMAIL_FROM: str({ default: "" }),
});
