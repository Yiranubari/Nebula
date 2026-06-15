import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../../../src/modules/auth/auth.service";
import { prismaMock, resetPrismaMocks } from "../../helpers/prisma-mock";
import { AppError } from "../../../src/utils/AppError";

vi.mock("../../../src/utils/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_pw"),
  comparePassword: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../src/utils/jwt", () => ({
  signAccessToken: vi.fn().mockReturnValue("access_token"),
  signRefreshToken: vi.fn().mockReturnValue("refresh_token"),
  verifyRefreshToken: vi.fn().mockReturnValue({ userId: "u1" }),
}));

vi.mock("../../../src/utils/mailer", () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
}));

const service = new AuthService(prismaMock as any);

const WS = "ws1";

const baseUser = {
  id: "u1",
  name: "Alice",
  email: "alice@test.com",
  passwordHash: "hashed_pw",
  role: "MEMBER" as const,
  avatar: null,
  otp: null,
  otpExpiresAt: null,
  isVerified: true,
  workspaceId: WS,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseWorkspace = {
  id: WS,
  name: "Alice's Workspace",
  slug: "alices-workspace-abc",
  ownerId: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => resetPrismaMocks());

describe("AuthService.register", () => {
  it("throws 400 if email already in use", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(baseUser);
    await expect(
      service.register({ name: "Alice", email: "alice@test.com", password: "pw123456" })
    ).rejects.toThrow(AppError);
  });

  it("creates user + workspace + default track and sends OTP email", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({
      ...baseUser,
      isVerified: false,
      otp: "123456",
      workspaceId: null,
    });
    prismaMock.workspace.create.mockResolvedValueOnce(baseWorkspace);
    prismaMock.user.update.mockResolvedValueOnce({
      ...baseUser,
      isVerified: false,
      otp: "123456",
      workspaceId: WS,
    });
    prismaMock.track.create.mockResolvedValueOnce({
      id: "tr1",
      workspaceId: WS,
      name: "general",
      isDefault: true,
      createdAt: new Date(),
    });
    prismaMock.trackMember.create.mockResolvedValueOnce({ trackId: "tr1", userId: "u1" });

    const result = await service.register({
      name: "Alice",
      email: "alice@test.com",
      password: "pw123456",
    });
    expect(result.message).toContain("verification code");
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
    expect(prismaMock.workspace.create).toHaveBeenCalledOnce();
    expect(prismaMock.track.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workspaceId: WS, isDefault: true }),
      })
    );
  });
});

describe("AuthService.login", () => {
  it("throws 401 if user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.login({ email: "nobody@test.com", password: "pw" })
    ).rejects.toThrow(AppError);
  });

  it("throws 403 if user not verified", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ ...baseUser, isVerified: false });
    await expect(
      service.login({ email: "alice@test.com", password: "pw" })
    ).rejects.toThrow(AppError);
  });

  it("returns tokens and user on success", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(baseUser);
    prismaMock.refreshToken.create.mockResolvedValueOnce({});

    const result = await service.login({ email: "alice@test.com", password: "pw" });
    expect(result.accessToken).toBe("access_token");
    expect(result.user.email).toBe("alice@test.com");
    expect(result.user).not.toHaveProperty("passwordHash");
  });
});

describe("AuthService.verifyOtp", () => {
  it("throws 400 if OTP invalid or expired", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...baseUser,
      isVerified: false,
      otp: "wrong",
      otpExpiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      service.verifyOtp({ email: "alice@test.com", otp: "123456" })
    ).rejects.toThrow(AppError);
  });

  it("verifies user and returns tokens", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...baseUser,
      isVerified: false,
      otp: "123456",
      otpExpiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.update.mockResolvedValueOnce(baseUser);
    prismaMock.track.findMany.mockResolvedValueOnce([]);
    prismaMock.refreshToken.create.mockResolvedValueOnce({});

    const result = await service.verifyOtp({ email: "alice@test.com", otp: "123456" });
    expect(result.accessToken).toBe("access_token");
    expect(result.user.isVerified).toBe(true);
  });
});
