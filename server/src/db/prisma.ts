import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const logQueries = process.env.LOG_QUERIES === "true";

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logQueries ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

const isTransientConnectionError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "P1001" || e.code === "P1002" || e.code === "P1017") return true;
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    msg.includes("kind: Closed") ||
    msg.includes("Connection terminated") ||
    msg.includes("Closed connection") ||
    msg.includes("server has closed the connection")
  );
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ args, query }) {
      try {
        return await query(args);
      } catch (err) {
        if (!isTransientConnectionError(err)) throw err;
        try {
          await basePrisma.$disconnect();
        } catch {
        }
        await sleep(150);
        await basePrisma.$connect();
        return query(args);
      }
    },
  },
}) as unknown as PrismaClient;
