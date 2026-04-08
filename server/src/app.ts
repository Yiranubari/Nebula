import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { globalRateLimiter } from "./middleware/rateLimit.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import taskRoutes from "./modules/tasks/tasks.routes";
import trackRoutes from "./modules/tracks/tracks.routes";
import messageRoutes from "./modules/messages/messages.routes";
import dmRoutes from "./modules/direct-messages/dm.routes";
import notificationRoutes from "./modules/notifications/notifications.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(globalRateLimiter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/tracks", trackRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/dm", dmRoutes);
  app.use("/api/notifications", notificationRoutes);

  app.use(errorMiddleware);

  return app;
}
