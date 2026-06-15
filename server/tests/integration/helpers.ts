
import { createServer } from "http";
import type { Express } from "express";

export async function getApp(): Promise<Express> {
  const { default: app } = await import("../../src/app");
  return app;
}

export async function cleanupDb(prisma: any) {
  await prisma.refreshToken.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.trackMember.deleteMany({});
  await prisma.track.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.directMessage.deleteMany({});
  await prisma.user.deleteMany({});
}
