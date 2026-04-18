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

type NebServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type NebSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export const registerChatHandlers = (_io: NebServer, socket: NebSocket) => {
  const userId = socket.data.userId;

  // ─── Send message ────────────────────────────────────────────────────────────
  socket.on("message:send", async (payload) => {
    try {
      const { trackId, content, parentId, attachments } = payload;

      // Verify membership
      const member = await prisma.trackMember.findUnique({
        where: { trackId_userId: { trackId, userId } },
      });
      if (!member) {
        socket.emit("message:new" as any, { error: "Not a track member" } as any);
        return;
      }

      const message = await prisma.message.create({
        data: {
          content,
          userId,
          trackId,
          parentId: parentId ?? null,
          ...(attachments ? { attachments } : {}),
          readBy: [userId],
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      });

      // Broadcast to all users in this track room
      getIO().to(`track:${trackId}`).emit("message:new", message as any);
    } catch (err) {
      logger.error({ err }, "chat:send error");
    }
  });

  // ─── React to message ────────────────────────────────────────────────────────
  socket.on("message:react", async ({ messageId, emoji }) => {
    try {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) return;

      const reactions = (message.reactions as Record<string, string[]>) ?? {};
      const existing = reactions[emoji] ?? [];

      // Toggle reaction
      if (existing.includes(userId)) {
        reactions[emoji] = existing.filter((id) => id !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...existing, userId];
      }

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { reactions },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      });

      getIO().to(`track:${message.trackId}`).emit("message:updated", updated as any);
    } catch (err) {
      logger.error({ err }, "chat:react error");
    }
  });

  // ─── Mark message as read ────────────────────────────────────────────────────
  socket.on("message:read", async ({ messageId }) => {
    try {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) return;

      if (!message.readBy.includes(userId)) {
        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { readBy: { push: userId } },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        });
        getIO().to(`track:${message.trackId}`).emit("message:updated", updated as any);
      }
    } catch (err) {
      logger.error({ err }, "chat:read error");
    }
  });

  // ─── Pin / unpin message ─────────────────────────────────────────────────────
  socket.on("message:pin", async ({ messageId, pinned }) => {
    try {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) return;

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { pinned },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      });

      getIO().to(`track:${message.trackId}`).emit("message:updated", updated as any);
    } catch (err) {
      logger.error({ err }, "chat:pin error");
    }
  });
};
