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

export const registerReactionHandlers = (_io: NebServer, _socket: NebSocket) => {

};

export const emitReactionNotification = async (
  reactorId: string,
  workspaceId: string,
  messageId: string,
  emoji: string
) => {
  try {
    const message = await prisma.message.findFirst({
      where: { id: messageId, workspaceId },
      select: { userId: true },
    });
    if (!message || message.userId === reactorId) return;

    const notification = await prisma.notification.create({
      data: {
        workspaceId,
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
