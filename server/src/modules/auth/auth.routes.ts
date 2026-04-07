import { Router } from "express";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate.middleware";
import { registerSchema, loginSchema } from "./auth.schemas";
import { strictRateLimiter } from "../../middleware/rateLimit.middleware";

const router = Router();

const authService = new AuthService(prisma);
const authController = new AuthController(authService);

router.post(
  "/register",
  strictRateLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);

router.post(
  "/login",
  strictRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.login)
);

router.post("/refresh", asyncHandler(authController.refresh));

router.post("/logout", asyncHandler(authController.logout));

export default router;
