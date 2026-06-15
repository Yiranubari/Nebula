
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getApp, cleanupDb } from "./helpers";
import type { Express } from "express";

const SKIP = !process.env.TEST_DATABASE_URL;

describe.skipIf(SKIP)("Auth Routes (Integration)", () => {
  let app: Express;
  let prisma: any;

  const testEmail = `test+${Date.now()}@nebula.test`;
  const testPassword = "TestPass123!";

  beforeAll(async () => {
    app = await getApp();
    const { prisma: db } = await import("../../src/db/prisma");
    prisma = db;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  describe("POST /api/auth/register", () => {
    it("returns 201 and a success message", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Test User", email: testEmail, password: testPassword });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/verification/i);
    });

    it("returns 400 if email already in use", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Test User", email: testEmail, password: testPassword });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already in use/i);
    });

    it("returns 400 if password is too short", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Test User", email: "new@nebula.test", password: "123" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns 403 if user is not verified", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/verify/i);
    });

    it("returns 401 for invalid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@nebula.test", password: "wrong" });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/verify-otp", () => {
    it("returns 400 for an invalid OTP", async () => {
      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ email: testEmail, otp: "000000" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid|expired/i);
    });
  });

  describe("POST /api/auth/resend-otp", () => {
    it("returns 200 and sends a new OTP", async () => {
      const res = await request(app)
        .post("/api/auth/resend-otp")
        .send({ email: testEmail });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/resent/i);
    });
  });
});
