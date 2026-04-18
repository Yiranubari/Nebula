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
  | "user.delete";

interface AuditContext {
  actorId?: string;
  targetId?: string;
  [key: string]: unknown;
}

/**
 * Emit a structured audit log line. These are indexed separately in most log
 * aggregators via the `audit: true` tag.
 */
export function audit(event: AuditEvent, ctx: AuditContext = {}) {
  logger.info({ audit: true, event, ...ctx }, `audit:${event}`);
}
