import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@nebula/shared";
import { prisma } from "../../db/prisma";
import { logger } from "../../config/logger";
import { getIO } from "../socket";
import { consume } from "../socketRateLimit";

type NebServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type NebSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/** Canonical room name for a DM conversation between two users */
const dmRoom = (a: string, b: string) =>
  `dm:${[a, b].sort().join("-")}`;

export const registerDmHandlers = (_io: NebServer, socket: NebSocket) => {
  const userId = socket.data.userId;

  // Auto-join own private room so notifications are sent even when not in a DM view
  socket.join(`user:${userId}`);

  // ─── Send DM ─────────────────────────────────────────────────────────────────
  socket.on("dm:send", async ({ toUserId, content, attachments }) => {
    try {
      if (!consume(socket.id, "dm:send", { capacity: 10, ratePerSec: 2 })) {
        socket.emit("error" as any, {
          message: "You're sending messages too quickly. Slow down.",
        });
        return;
      }

      if (!toUserId || typeof toUserId !== "string") {
        return;
      }

      // Validate recipient exists to avoid a misleading silent failure
      const recipient = await prisma.user.findUnique({
        where: { id: toUserId },
        select: { id: true },
      });
      if (!recipient) {
        socket.emit("error" as any, { message: "Recipient does not exist" });
        return;
      }

      const message = await prisma.directMessage.create({
        data: {
          content,
          fromUserId: userId,
          toUserId,
          ...(attachments ? { attachments } : {}),
          readBy: [userId],
        },
        include: {
          from: { select: { id: true, name: true, avatar: true } },
          to: { select: { id: true, name: true, avatar: true } },
        },
      });

      const room = dmRoom(userId, toUserId);

      // Emit to the shared DM room (both parties who joined it)
      getIO().to(room).emit("dm:new", message as any);

      // Also notify the recipient's private room in case they haven't joined the DM room
      getIO().to(`user:${toUserId}`).emit("dm:new", message as any);
    } catch (err) {
      logger.error({ err }, "dm:send error");
    }
  });

  // ─── React to DM ─────────────────────────────────────────────────────────────
  socket.on("dm:react", async ({ messageId, emoji }) => {
    try {
      const message = await prisma.directMessage.findUnique({ where: { id: messageId } });
      if (!message) return;

      // Only sender or receiver can react
      if (message.fromUserId !== userId && message.toUserId !== userId) return;

      const reactions = (message.reactions as Record<string, string[]>) ?? {};
      const existing = reactions[emoji] ?? [];

      if (existing.includes(userId)) {
        reactions[emoji] = existing.filter((id) => id !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...existing, userId];
      }

      const updated = await prisma.directMessage.update({
        where: { id: messageId },
        data: { reactions },
        include: {
          from: { select: { id: true, name: true, avatar: true } },
          to: { select: { id: true, name: true, avatar: true } },
        },
      });

      const room = dmRoom(message.fromUserId, message.toUserId);
      getIO().to(room).emit("dm:updated", updated as any);
    } catch (err) {
      logger.error({ err }, "dm:react error");
    }
  });
};
