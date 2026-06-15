import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const logQueries = process.env.LOG_QUERIES === "true";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logQueries ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
