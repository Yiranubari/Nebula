import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  avatar: z.string().url().or(z.literal("")).optional(),
  /** Name of the workspace this user is creating. Optional — defaults to
   * "{name}'s Workspace" when omitted. */
  workspaceName: z
    .string()
    .min(2, "Workspace name must be at least 2 characters long")
    .max(60, "Workspace name must be at most 60 characters long")
    .optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 characters long"),
});
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

export const resendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export type ResendOtpDto = z.infer<typeof resendOtpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 characters long"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long"),
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export type InviteDto = z.infer<typeof inviteSchema>;

export const completeInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters long"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  otp: z.string().length(6, "OTP must be 6 characters long"),
});
export type CompleteInviteDto = z.infer<typeof completeInviteSchema>;
