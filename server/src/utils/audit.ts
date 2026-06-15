import { logger } from "../config/logger";

type AuditEvent =
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.verify_otp"
  | "auth.password_reset"
  | "auth.refresh"
  | "task.delete"
  | "track.delete"
  | "track.rename"
  | "user.delete"
  | "user.invite"
  | "user.role_change";

interface AuditContext {
  actorId?: string;
  targetId?: string;
  [key: string]: unknown;
}

export function audit(event: AuditEvent, ctx: AuditContext = {}) {
  logger.info({ audit: true, event, ...ctx }, `audit:${event}`);
}
