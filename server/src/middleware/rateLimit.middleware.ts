import { rateLimit } from "express-rate-limit";
import type { Request } from "express";

const isProd = process.env.NODE_ENV === "production";

const keyByUserOrIp = (req: Request): string => {
  const userId = (req as any).user?.id as string | undefined;
  return userId ? `u:${userId}` : `ip:${req.ip ?? "unknown"}`;
};

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 600 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: {
    status: "error",
    message: "Too many requests, please slow down.",
  },
});

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many attempts, please try again later.",
  },
});
