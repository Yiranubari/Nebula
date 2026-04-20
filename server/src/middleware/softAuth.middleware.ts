import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

/**
 * Best-effort JWT decode — populates `req.user` from the access token if
 * one is present and valid, otherwise falls through silently.
 *
 * Purpose: let downstream middleware (especially the global rate limiter)
 * key on the user id so office NATs and mobile CGNATs don't share a single
 * IP bucket. Real authentication enforcement is still `protect`'s job;
 * `protect` overwrites `req.user` with a full DB record afterwards.
 *
 * We intentionally avoid a DB lookup here — this runs on every request and
 * must stay cheap.
 */
export const softAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return next();
    const token = header.slice(7);
    const claims = verifyAccessToken(token);
    // The real req.user gets fleshed out by `protect` with name/email; we
    // only need the id for rate-limit keying here.
    (req as any).user = {
      id: claims.userId,
      role: claims.role,
      workspaceId: claims.workspaceId,
    };
  } catch {
    // Invalid or expired token — pretend it wasn't set.
  }
  next();
};
