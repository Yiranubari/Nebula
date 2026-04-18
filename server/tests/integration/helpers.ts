/**
 * Integration test helpers — creates a Supertest agent against the real
 * Express app (without starting a server on a port).
 *
 * Requires TEST_DATABASE_URL to be set in .env.test for a real DB connection.
 * Use `npm run test:integration` to run only these tests.
 */

import { createServer } from "http";
import type { Express } from "express";

/** Lazy-loads the Express app to avoid side-effects in unit tests */
export async function getApp(): Promise<Express> {
  // Dynamic import so the DB connection is only established when needed
  const { default: app } = await import("../../src/app");
  return app;
}

/** Clean-up helper — call in `afterAll` hooks */
export async function cleanupDb(prisma: any) {
  // Truncate in dependency order
  await prisma.refreshToken.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.trackMember.deleteMany({});
  await prisma.track.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.directMessage.deleteMany({});
  await prisma.user.deleteMany({});
}
