import type { Request } from "express";
import { AppError } from "./AppError";

export function requireWorkspace(req: Request): string {
  if (!req.user?.workspaceId) {
    throw new AppError(403, "No workspace context for this request");
  }
  return req.user.workspaceId;
}
