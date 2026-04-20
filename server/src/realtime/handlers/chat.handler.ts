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

const emitError = (socket: NebSocket, message: string) => {
  socket.emit("error" as any, { message });
};

/**
 * True if the user can interact with this track. Admins always pass — they
 * can send, react, pin, and read-mark messages in any workspace channel
 * without explicit membership.
 */
const canAccessTrack = async (
  trackId: string,
  userId: string,
  role: "ADMIN" | "MEMBER"
) => {
  if (role === "ADMIN") return true;
  const member = await prisma.trackMember.findUnique({
    where: { trackId_userId: { trackId, userId } },
  });
  return !!member;
};

/** Require that the track exists and belongs to the caller's workspace. */
const trackInWorkspace = async (trackId: string, workspaceId: string) => {
  const track = await prisma.track.findFirst({
    where: { id: trackId, workspaceId },
    select: { id: true },
  });
  return !!track;
};

export const registerChatHandlers = (_io: NebServer, socket: NebSocket) => {
  const { userId, role, workspaceId } = socket.data;

  // ─── Send message ────────────────────────────────────────────────────────────
  socket.on("message:send", async (payload) => {
    try {
      // Rate limit: burst 10, ~2 msgs/sec sustained
      if (!consume(socket.id, "message:send", { capacity: 10, ratePerSec: 2 })) {
        emitError(socket, "You're sending messages too quickly. Slow down.");
        return;
      }

      const { trackId, content, parentId, attachments } = payload;

      if (!trackId || !content) {
        emitError(socket, "Missing trackId or content");
        return;
      }

      if (!(await trackInWorkspace(trackId, workspaceId))) {
        emitError(socket, "Track not found");
        return;
      }

      if (!(await canAccessTrack(trackId, userId, role))) {
        emitError(socket, "Not a track member");
        return;
      }

      // Lazy-join the track's socket room. Tracks created/joined AFTER the
      // socket connected aren't in `socket.rooms` from the initial handshake,
      // so the sender would otherwise miss their own `message:new` echo.
      if (!socket.rooms.has(`track:${trackId}`)) {
        socket.join(`track:${trackId}`);
      }

      const message = await prisma.message.create({
        data: {
          workspaceId,
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
      emitError(socket, "Could not send message");
    }
  });

  // ─── React to message ────────────────────────────────────────────────────────
  socket.on("message:react", async ({ messageId, emoji }) => {
    try {
      if (!messageId || !emoji) return;
      const message = await prisma.message.findFirst({
        where: { id: messageId, workspaceId },
      });
      if (!message) return;

      if (!(await canAccessTrack(message.trackId, userId, role))) {
        emitError(socket, "Not a member of this track");
        return;
      }

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

      getIO()
        .to(`track:${message.trackId}`)
        .emit("message:updated", updated as any);
    } catch (err) {
      logger.error({ err }, "chat:react error");
    }
  });

  // ─── Mark message as read ────────────────────────────────────────────────────
  socket.on("message:read", async ({ messageId }) => {
    try {
      if (!messageId) return;
      const message = await prisma.message.findFirst({
        where: { id: messageId, workspaceId },
      });
      if (!message) return;

      if (!(await canAccessTrack(message.trackId, userId, role))) {
        emitError(socket, "Not a member of this track");
        return;
      }

      if (!message.readBy.includes(userId)) {
        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { readBy: { push: userId } },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        });
        getIO()
          .to(`track:${message.trackId}`)
          .emit("message:updated", updated as any);
      }
    } catch (err) {
      logger.error({ err }, "chat:read error");
    }
  });

  // ─── Pin / unpin message ─────────────────────────────────────────────────────
  socket.on("message:pin", async ({ messageId, pinned }) => {
    try {
      if (!messageId) return;
      const message = await prisma.message.findFirst({
        where: { id: messageId, workspaceId },
      });
      if (!message) return;

      if (!(await canAccessTrack(message.trackId, userId, role))) {
        emitError(socket, "Not a member of this track");
        return;
      }

      // Only the author or an admin can pin/unpin
      if (role !== "ADMIN" && message.userId !== userId) {
        emitError(socket, "Only admins or the author can pin this message");
        return;
      }

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { pinned },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      });

      getIO()
        .to(`track:${message.trackId}`)
        .emit("message:updated", updated as any);
    } catch (err) {
      logger.error({ err }, "chat:pin error");
    }
  });
};
