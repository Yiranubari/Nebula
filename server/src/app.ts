import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { isAllowedOrigin } from "./config/cors";
import { globalRateLimiter } from "./middleware/rateLimit.middleware";
import { softAuth } from "./middleware/softAuth.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import { requestId } from "./middleware/requestId.middleware";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import taskRoutes from "./modules/tasks/tasks.routes";
import trackRoutes from "./modules/tracks/tracks.routes";
import messageRoutes from "./modules/messages/messages.routes";
import dmRoutes from "./modules/direct-messages/dm.routes";
import notificationRoutes from "./modules/notifications/notifications.routes";
import uploadRoutes from "./modules/uploads/uploads.routes";
import { prisma } from "./db/prisma";
import { logger } from "./config/logger";

export function createApp() {
  const app = express();

  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(requestId);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        if (isAllowedOrigin(origin)) return cb(null, true);
        cb(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      exposedHeaders: ["X-Request-Id"],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(softAuth);
  app.use(globalRateLimiter);

  app.get("/health", async (_req, res) => {
    const timestamp = new Date().toISOString();
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("db probe timeout")), 5000)
        ),
      ]);
      res.json({ status: "ok", db: "up", timestamp });
    } catch (err) {
      logger.warn({ err }, "Health probe: database unreachable");
      res.status(503).json({ status: "degraded", db: "down", timestamp });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/tracks", trackRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/dm", dmRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/uploads", uploadRoutes);

  app.use(errorMiddleware);

  return app;
}
