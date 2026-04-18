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

/**
 * Reaction handler for both track messages and DMs.
 * 
 * NOTE: Reaction toggling is also handled inline inside chat.handler.ts and
 * dm.handler.ts (via `message:react` and `dm:react` events respectively).
 * This file provides a centralised helper and can be used for future
 * cross-cutting reaction logic (e.g. generating REACTION notifications).
 *
 * Notification emission lives here so it is decoupled from the raw message handlers.
 */
export const registerReactionHandlers = (_io: NebServer, _socket: NebSocket) => {
  // Reactions themselves are handled via message:react / dm:react in their
  // respective handlers.  This handler's primary responsibility is to fire
  // REACTION notifications via the notification:new event.

  // The chat.handler.ts can call emitReactionNotification after updating DB.
  // Keeping this as a placeholder so socket.ts can import it predictably.
};

/**
 * After persisting a reaction, call this to create a notification and push
 * it real-time to the message author.
 */
export const emitReactionNotification = async (
  reactorId: string,
  messageId: string,
  emoji: string
) => {
  try {
    const message = await prisma.message.findUnique({ where: { id: messageId }, select: { userId: true } });
    if (!message || message.userId === reactorId) return; // Don't notify yourself

    const notification = await prisma.notification.create({
      data: {
        type: "REACTION",
        messageId,
        emoji,
        requesterId: reactorId,
        recipientId: message.userId,
      },
    });

    getIO().to(`user:${message.userId}`).emit("notification:new", notification as any);
  } catch (err) {
    logger.error({ err }, "reaction notification error");
  }
};
