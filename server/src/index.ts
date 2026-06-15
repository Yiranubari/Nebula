import "dotenv/config";
import http from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./db/prisma";
import { initSocket, getIO } from "./realtime/socket";

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  initSocket(server);

  try {
    await prisma.$connect();
    logger.info("Database connected");
  } catch (err) {
    logger.warn({ err }, "Database connection failed — server starting without DB");
  }

  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");

    try {
      await new Promise<void>((resolve) => {
        try {
          getIO().close(() => resolve());
        } catch {
          resolve();
        }
      });
    } catch (err) {
      logger.warn({ err }, "Error closing Socket.IO");
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.warn({ err }, "Error disconnecting Prisma");
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal startup error");
  process.exit(1);
});
