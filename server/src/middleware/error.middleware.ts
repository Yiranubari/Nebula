import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { env } from "../config/env";

function formatZod(err: ZodError) {
  const first = err.issues[0];
  const path = first?.path?.length ? first.path.join(".") : "";
  const base = first?.message ?? "Validation failed";
  const message = path ? `${path}: ${base}` : base;
  const body: Record<string, unknown> = {
    status: "error",
    message,
  };
  if (env.NODE_ENV !== "production") {
    body.errors = err.flatten().fieldErrors;
  }
  return body;
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.id;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ ...formatZod(err), requestId });
    return;
  }

  logger.error({ err, requestId, path: req.path, method: req.method }, "Unhandled error");

  res.status(500).json({
    status: "error",
    message: "Internal server error",
    requestId,
  });
}
