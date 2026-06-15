
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getApp } from "./helpers";
import type { Express } from "express";

const SKIP = !process.env.TEST_DATABASE_URL;

describe.skipIf(SKIP)("Tasks Routes — Integration", () => {
  let app: Express;
  let accessToken: string;
  let prisma: any;

  beforeAll(async () => {
    app = await getApp();
    const { prisma: db } = await import("../../src/db/prisma");
    prisma = db;

    const email = `tasks+${Date.now()}@nebula.test`;
    const password = "TasksTest123!";

    await request(app).post("/api/auth/register").send({ name: "Tasks Tester", email, password });

    const user = await prisma.user.findUnique({ where: { email } });
    const otp = user?.otp ?? "";

    const verifyRes = await request(app).post("/api/auth/verify-otp").send({ email, otp });
    accessToken = verifyRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /api/tasks", () => {
    it("requires authentication", async () => {
      const res = await request(app).get("/api/tasks");
      expect(res.status).toBe(401);
    });

    it("returns an array of tasks when authenticated", async () => {
      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tasks ?? res.body)).toBe(true);
    });
  });

  describe("POST /api/tasks", () => {
    it("creates a task and returns 201", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Integration test task", priority: "HIGH" });

      expect(res.status).toBe(201);
      expect(res.body.task?.title ?? res.body.title).toBe("Integration test task");
    });

    it("returns 400 if title is missing", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priority: "LOW" });

      expect(res.status).toBe(400);
    });
  });
});
