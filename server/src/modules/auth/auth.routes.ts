import { Router } from "express";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate.middleware";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteSchema,
  completeInviteSchema,
} from "./auth.schemas";
import { strictRateLimiter } from "../../middleware/rateLimit.middleware";
import { protect } from "./auth.middleware";

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
  "/verify-otp",
  strictRateLimiter,
  validate(verifyOtpSchema),
  asyncHandler(authController.verifyOtp)
);

router.post(
  "/resend-otp",
  strictRateLimiter,
  validate(resendOtpSchema),
  asyncHandler(authController.resendOtp)
);

router.post(
  "/login",
  strictRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.login)
);

router.post(
  "/forgot-password",
  strictRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);

router.post(
  "/reset-password",
  strictRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);

router.post("/refresh", asyncHandler(authController.refresh));

router.post("/logout", asyncHandler(authController.logout));

router.post(
  "/invite",
  protect,
  strictRateLimiter,
  validate(inviteSchema),
  asyncHandler(authController.invite)
);

router.post(
  "/complete-invite",
  strictRateLimiter,
  validate(completeInviteSchema),
  asyncHandler(authController.completeInvite)
);

export default router;
