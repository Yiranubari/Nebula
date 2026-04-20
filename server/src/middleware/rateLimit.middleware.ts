import { rateLimit } from "express-rate-limit";
import type { Request } from "express";

const isProd = process.env.NODE_ENV === "production";

/**
 * Key the rate-limit bucket by authenticated user id when present, else by
 * IP. Once a user signs in, they carry their own budget — a hundred people
 * behind the same office NAT or mobile CGNAT don't collectively share one
 * IP's quota anymore. See softAuth.middleware.ts for where req.user is
 * populated before this limiter runs.
 */
const keyByUserOrIp = (req: Request): string => {
  const userId = (req as any).user?.id as string | undefined;
  return userId ? `u:${userId}` : `ip:${req.ip ?? "unknown"}`;
};

/**
 * Applied to every API request. Generous ceiling so normal usage never
 * trips it — meant to catch abuse, not typical interactive traffic.
 * Authenticated users are keyed by id; anonymous traffic by IP.
 */
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

/**
 * IP-keyed brute-force guard for unauthenticated auth endpoints
 * (login, register, verify-otp, forgot-password, reset-password, …).
 * The point here is defending the account set, so keying by user would
 * miss credential-stuffing against many accounts from one attacker.
 */
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
