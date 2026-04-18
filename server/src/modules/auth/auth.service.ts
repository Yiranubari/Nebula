import { BaseService } from "../../core/BaseService";
import { RegisterDto, LoginDto, VerifyOtpDto, ResendOtpDto, ForgotPasswordDto, ResetPasswordDto } from "./auth.schemas";
import { AppError } from "../../utils/AppError";
import { hashPassword, comparePassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { sendMail } from "../../utils/mailer";
import { audit } from "../../utils/audit";
import type { User } from "@prisma/client";

export class AuthService extends BaseService {
  async register(data: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new AppError(400, "Email already in use");
    }

    const passwordHash = await hashPassword(data.password);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        otp,
        otpExpiresAt,
      },
    });

    await sendMail(
      user.email,
      "Verify your Nebula account",
      `Your verification code is: ${otp}\n\nIt will expire in 15 minutes.`
    );

    audit("auth.register", { actorId: user.id });
    return { message: "Account created successfully. Please check your email for the verification code.", user: this.sanitizeUser(user) };
  }

  async verifyOtp(data: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (user.isVerified) {
      throw new AppError(400, "User is already verified");
    }

    if (user.otp !== data.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new AppError(400, "Invalid or expired OTP");
    }

    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    const tokens = this.generateTokens(verifiedUser.id, verifiedUser.role);
    await this.storeRefreshToken(verifiedUser.id, tokens.refreshToken);

    audit("auth.verify_otp", { actorId: verifiedUser.id });
    return { message: "Email verified successfully", user: this.sanitizeUser(verifiedUser), ...tokens };
  }

  async resendOtp(data: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (user.isVerified) {
      throw new AppError(400, "User is already verified");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiresAt },
    });

    await sendMail(
      user.email,
      "Your new Nebula verification code",
      `Your new verification code is: ${otp}\n\nIt will expire in 15 minutes.`
    );

    return { message: "OTP resent successfully to your email." };
  }

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const valid = await comparePassword(data.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "Invalid credentials");
    }

    if (!user.isVerified) {
      throw new AppError(403, "Please verify your email before logging in.");
    }

    const tokens = this.generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    audit("auth.login", { actorId: user.id });
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async forgotPassword(data: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return { message: "If an account with that email exists, a password reset OTP has been sent." };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiresAt },
    });

    await sendMail(
      user.email,
      "Reset your Nebula password",
      `Your password reset code is: ${otp}\n\nIt will expire in 15 minutes.`
    );

    return { message: "If an account with that email exists, a password reset OTP has been sent." };
  }

  async resetPassword(data: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    // Return the same error shape whether the user exists or not to avoid
    // leaking account existence.
    const invalid = new AppError(400, "Invalid or expired OTP");

    if (!user) throw invalid;

    // Password reset is only meaningful for verified accounts — this also
    // prevents a signup-verification OTP from being reused to reset a
    // never-verified account.
    if (!user.isVerified) throw invalid;

    if (
      user.otp !== data.otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      throw invalid;
    }

    const passwordHash = await hashPassword(data.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          otp: null,
          otpExpiresAt: null,
        },
      }),
      // Invalidate all existing sessions so the reset also logs the user out
      // of any compromised devices.
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    audit("auth.password_reset", { actorId: user.id });
    return { message: "Password has been reset successfully." };
  }

  async refresh(token: string) {
    try {
      const payload = verifyRefreshToken(token);

      // Atomically consume the old token — if another concurrent request
      // already rotated it, count will be 0 and we reject.
      const { count } = await this.prisma.refreshToken.deleteMany({
        where: { token, userId: payload.userId },
      });
      if (count === 0) {
        throw new Error("Refresh token already rotated or invalid");
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!user) {
        throw new Error("User not found");
      }

      const tokens = this.generateTokens(user.id, user.role);
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      return { user: this.sanitizeUser(user), ...tokens };
    } catch {
      throw new AppError(401, "Invalid or expired refresh token");
    }
  }

  async logout(token: string) {
    const session = await this.prisma.refreshToken.findUnique({
      where: { token },
      select: { userId: true },
    });
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
    if (session) audit("auth.logout", { actorId: session.userId });
  }

  private generateTokens(userId: string, role: string) {
    const accessToken = signAccessToken({ userId, role });
    const refreshToken = signRefreshToken({ userId });
    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  private sanitizeUser(user: User) {
    const { passwordHash: _1, otp: _2, otpExpiresAt: _3, ...rest } = user;
    return rest;
  }
}
