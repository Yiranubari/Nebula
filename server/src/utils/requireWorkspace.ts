import type { Request } from "express";
import { AppError } from "./AppError";

/**
 * Extract the current request's workspaceId, or throw 403.
 *
 * Every authenticated API route is workspace-scoped — the auth middleware
 * loads `workspaceId` onto `req.user`. This helper is the bouncer that makes
 * sure no route silently processes a request without that scope.
 */
export function requireWorkspace(req: Request): string {
  if (!req.user?.workspaceId) {
    throw new AppError(403, "No workspace context for this request");
  }
  return req.user.workspaceId;
}
