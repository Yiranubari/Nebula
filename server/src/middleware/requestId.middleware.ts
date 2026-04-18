import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Attach a stable request ID on every inbound request. Honours an incoming
 * `X-Request-Id` header when present (for trace propagation), and mirrors the
 * final value back on the response so clients can quote it when reporting
 * failures.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.length > 0 && incoming.length <= 64
      ? incoming
      : randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}
