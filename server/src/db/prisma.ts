import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Opt in to SQL query logging with LOG_QUERIES=true. We no longer log queries
// by default in development because the output can leak into log sinks or
// screenshots and exposes table/column shapes.
const logQueries = process.env.LOG_QUERIES === "true";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logQueries ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
