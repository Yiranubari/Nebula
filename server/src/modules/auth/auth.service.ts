import { randomBytes } from "node:crypto";
import { BaseService } from "../../core/BaseService";
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  InviteDto,
  CompleteInviteDto,
} from "./auth.schemas";
import { AppError } from "../../utils/AppError";
import { hashPassword, comparePassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { sendMail } from "../../utils/mailer";
import {
  verifyOtpEmail,
  resendOtpEmail,
  passwordResetEmail,
  inviteEmail,
} from "../../utils/emailTemplates";
import { audit } from "../../utils/audit";
import { env } from "../../config/env";
import type { User } from "@prisma/client";

type Role = "ADMIN" | "MEMBER";

/** Turn a human-friendly workspace name into a URL-safe slug. */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  // Append a short random suffix so concurrent signups with the same name
  // don't collide on Workspace.slug's unique index.
  const suffix = randomBytes(3).toString("hex");
  return `${base || "workspace"}-${suffix}`;
}

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

    // Every public signup creates a new workspace where the signer is ADMIN.
    // Other people join that workspace only via admin invite — there's no way
    // to land in an existing workspace through the public register flow.
    const workspaceName =
      data.workspaceName?.trim() || `${data.name.trim()}'s Workspace`;

    const { user } = await this.prisma.$transaction(
      async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash,
            role: "ADMIN",
            avatar: data.avatar || null,
            otp,
            otpExpiresAt,
          },
        });

        const workspace = await tx.workspace.create({
          data: {
            name: workspaceName,
            slug: slugify(workspaceName),
            ownerId: createdUser.id,
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: createdUser.id },
          data: { workspaceId: workspace.id },
        });

        // Seed a default #general track so the new workspace isn't empty when
        // the admin first logs in. The track is flagged isDefault so invitees
        // auto-join it on account activation.
        const general = await tx.track.create({
          data: {
            name: "general",
            isDefault: true,
            workspaceId: workspace.id,
          },
        });
        await tx.trackMember.create({
          data: { trackId: general.id, userId: updatedUser.id },
        });

        return { user: updatedUser };
      },
      {
        // Neon's serverless pooler can take 2-4 seconds to wake a cold branch.
        // Five sequential queries at ~1s each comfortably blows the default 5s
        // interactive transaction window, so we give the whole thing 20s.
        maxWait: 10_000,
        timeout: 20_000,
      }
    );

    const { subject, text, html } = verifyOtpEmail(otp);
    await sendMail(user.email, subject, text, html);

    audit("auth.register", { actorId: user.id, workspaceId: user.workspaceId });
    return {
      message:
        "Workspace created successfully. Please check your email for the verification code.",
      user: this.sanitizeUser(user),
    };
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

    // Auto-join every track marked as default (e.g. #general) in the user's
    // workspace so verified accounts land inside a live conversation.
    if (verifiedUser.workspaceId) {
      await this.joinDefaultTracks(verifiedUser.id, verifiedUser.workspaceId);
    }

    const tokens = this.generateTokens(
      verifiedUser.id,
      verifiedUser.role,
      verifiedUser.workspaceId
    );
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

    const { subject, text, html } = resendOtpEmail(otp);
    await sendMail(user.email, subject, text, html);

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

    const tokens = this.generateTokens(user.id, user.role, user.workspaceId);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    audit("auth.login", { actorId: user.id, workspaceId: user.workspaceId });
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

    const { subject, text, html } = passwordResetEmail(otp);
    await sendMail(user.email, subject, text, html);

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

      const tokens = this.generateTokens(user.id, user.role, user.workspaceId);
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

  private generateTokens(
    userId: string,
    role: string,
    workspaceId: string | null
  ) {
    const accessToken = signAccessToken({ userId, role, workspaceId });
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

  // ─── Invite flow ───────────────────────────────────────────────────────────

  /**
   * An admin invites someone by email. If no user with that email exists we
   * pre-create a pending account (isVerified: false) with a throwaway password
   * hash. If a pending invite already exists for this email we just refresh
   * the OTP and resend the email — idempotent from the admin's point of view.
   */
  async invite(
    actor: { id: string; role: Role; name: string; workspaceId: string | null },
    data: InviteDto
  ) {
    if (actor.role !== "ADMIN") {
      throw new AppError(403, "Only admins can invite members");
    }
    if (!actor.workspaceId) {
      throw new AppError(400, "You must belong to a workspace to invite members.");
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing && existing.isVerified) {
      // An existing verified user might already belong to another workspace —
      // Nebula is single-workspace-per-user, so stealing them would break the
      // other tenant's data. Fail clearly.
      throw new AppError(
        400,
        "That email already belongs to a verified account."
      );
    }

    // If a pending invite exists for a DIFFERENT workspace, don't silently
    // rewrite its tenancy — that would let another admin hijack a pending
    // invite. Reject with a clear message.
    if (
      existing &&
      existing.workspaceId &&
      existing.workspaceId !== actor.workspaceId
    ) {
      throw new AppError(
        400,
        "That email has a pending invitation in another workspace."
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    let invitee: User;
    if (existing) {
      invitee = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          otp,
          otpExpiresAt,
          invitedById: actor.id,
          workspaceId: actor.workspaceId,
        },
      });
    } else {
      const placeholder = await hashPassword(
        randomBytes(32).toString("base64url")
      );
      invitee = await this.prisma.user.create({
        data: {
          name: data.email.split("@")[0],
          email: data.email,
          passwordHash: placeholder,
          role: "MEMBER",
          isVerified: false,
          otp,
          otpExpiresAt,
          invitedById: actor.id,
          workspaceId: actor.workspaceId,
        },
      });
    }

    // Fetch the workspace name so the email can say "Join <workspace> on Nebula".
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: actor.workspaceId },
      select: { name: true },
    });

    const completeUrl = `${env.CLIENT_URL}/#/signup?invite=${encodeURIComponent(
      data.email
    )}`;
    const { subject, text, html } = inviteEmail({
      otp,
      inviterName: actor.name,
      workspaceName: workspace?.name,
      completeUrl,
    });
    await sendMail(invitee.email, subject, text, html);

    audit("user.invite", {
      actorId: actor.id,
      targetId: invitee.id,
      workspaceId: actor.workspaceId,
    });

    return { message: "Invitation sent", user: this.sanitizeUser(invitee) };
  }

  /**
   * Invitee sets their real name + password + OTP to activate the account.
   */
  async completeInvite(data: CompleteInviteDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) {
      throw new AppError(400, "Invalid invitation or OTP");
    }
    if (user.isVerified) {
      throw new AppError(
        400,
        "This account is already active. Try signing in instead."
      );
    }
    if (
      user.otp !== data.otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      throw new AppError(400, "Invalid or expired OTP");
    }

    const passwordHash = await hashPassword(data.password);

    const verified = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        passwordHash,
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    if (verified.workspaceId) {
      await this.joinDefaultTracks(verified.id, verified.workspaceId);
    }

    const tokens = this.generateTokens(
      verified.id,
      verified.role,
      verified.workspaceId
    );
    await this.storeRefreshToken(verified.id, tokens.refreshToken);

    audit("auth.verify_otp", {
      actorId: verified.id,
      workspaceId: verified.workspaceId,
    });

    return {
      message: "Welcome to Nebula!",
      user: this.sanitizeUser(verified),
      ...tokens,
    };
  }

  /**
   * Add a user to every track marked `isDefault`. Safe to call for users who
   * are already members of some or all default tracks (uses skipDuplicates).
   */
  private async joinDefaultTracks(userId: string, workspaceId: string) {
    const defaults = await this.prisma.track.findMany({
      where: { isDefault: true, workspaceId },
      select: { id: true },
    });
    if (defaults.length === 0) return;

    await this.prisma.trackMember.createMany({
      data: defaults.map((t) => ({ trackId: t.id, userId })),
      skipDuplicates: true,
    });
  }
}
