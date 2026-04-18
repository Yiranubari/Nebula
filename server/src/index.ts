import "dotenv/config";
import http from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./db/prisma";
import { initSocket } from "./realtime/socket";

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

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
