import { Server } from "socket.io";
import type http from "node:http";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@nebula/shared";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../db/prisma";
import { logger } from "../config/logger";
import { isAllowedOrigin } from "../config/cors";
import { registerPresenceHandlers } from "./handlers/presence.handler";
import { registerTypingHandlers } from "./handlers/typing.handler";
import { registerChatHandlers } from "./handlers/chat.handler";
import { registerDmHandlers } from "./handlers/dm.handler";
import { registerReactionHandlers } from "./handlers/reaction.handler";
import { registerHuddleHandlers } from "./handlers/huddle.handler";
import { releaseSocket } from "./socketRateLimit";

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export const initSocket = (httpServer: http.Server) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (isAllowedOrigin(origin)) return cb(null, true);
        cb(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) return next(new Error("Authentication error: No token provided"));

      const decoded = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, role: true, workspaceId: true },
      });

      if (!user) return next(new Error("Authentication error: User not found"));
      if (!user.workspaceId)
        return next(new Error("Authentication error: No workspace assigned"));

      socket.data.userId = user.id;
      socket.data.userName = user.name;
      socket.data.role = user.role;
      socket.data.workspaceId = user.workspaceId;
      next();
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "TokenExpiredError" || name === "JsonWebTokenError") {
        logger.debug({ name }, "Socket auth rejected (expired or invalid token)");
      } else {
        logger.error({ err }, "Socket authentication failed");
      }
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId, userName, workspaceId } = socket.data;
    logger.info(
      `User connected via socket: ${userName} (${userId}) ws=${workspaceId}`
    );

    socket.join(`ws:${workspaceId}`);

    socket.join(`user:${userId}`);

    try {
      const memberships = await prisma.trackMember.findMany({
        where: { userId, track: { workspaceId } },
        select: { trackId: true },
      });
      for (const { trackId } of memberships) {
        socket.join(`track:${trackId}`);
      }
    } catch (err) {
      logger.error({ err }, "Failed to auto-join track rooms");
    }

    registerPresenceHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerDmHandlers(io, socket);
    registerReactionHandlers(io, socket);
    registerHuddleHandlers(io, socket);

    socket.on("disconnect", () => {
      releaseSocket(socket.id);
      logger.info(`User disconnected: ${userName} (${userId})`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO is not initialised. Call initSocket first.");
  return io;
};
