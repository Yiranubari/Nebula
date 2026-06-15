import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  HuddleParticipant,
} from "@nebula/shared";
import { logger } from "../../config/logger";
import { getIO } from "../socket";
import { setInHuddle } from "../presenceStore";

type NebServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type NebSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const huddleRooms = new Map<
  string,
  Map<string, HuddleParticipant & { socketId: string }>
>();

const getParticipants = (roomId: string): HuddleParticipant[] =>
  Array.from(huddleRooms.get(roomId)?.values() ?? []).map(
    ({ userId, muted, handRaised }) => ({ userId, muted, handRaised })
  );

export const registerHuddleHandlers = (_io: NebServer, socket: NebSocket) => {
  const { userId, workspaceId } = socket.data;

  const roomKey = (roomId: string) => `ws:${workspaceId}:huddle:${roomId}`;

  socket.on("huddle:join", ({ roomId }) => {
    const key = roomKey(roomId);
    socket.join(key);

    if (!huddleRooms.has(key)) huddleRooms.set(key, new Map());
    const room = huddleRooms.get(key)!;
    const alreadyInRoom = room.has(userId);
    room.set(userId, {
      userId,
      muted: false,
      handRaised: false,
      socketId: socket.id,
    });

    const participants = getParticipants(key);

    socket.emit("huddle:state", { roomId, participants });

    socket.to(key).emit("huddle:user-joined", {
      roomId,
      userId,
      participants,
    });

    if (!alreadyInRoom) {
      setInHuddle(getIO(), userId, workspaceId, roomId);
      logger.info(`${userId} joined huddle ${roomId} ws=${workspaceId}`);
    }
  });

  const leaveHuddle = (roomId: string) => {
    const key = roomKey(roomId);
    const wasInRoom = huddleRooms.get(key)?.has(userId) ?? false;
    if (!wasInRoom) return;

    huddleRooms.get(key)?.delete(userId);
    if (huddleRooms.get(key)?.size === 0) huddleRooms.delete(key);

    socket.leave(key);

    const participants = getParticipants(key);
    getIO().to(key).emit("huddle:user-left", {
      roomId,
      userId,
      participants,
    });

    setInHuddle(getIO(), userId, workspaceId, null);
    logger.info(`${userId} left huddle ${roomId}`);
  };

  socket.on("huddle:leave", ({ roomId }) => {
    leaveHuddle(roomId);
  });

  socket.on("huddle:offer", ({ roomId, toUserId, sdp }) => {
    const target = huddleRooms.get(roomKey(roomId))?.get(toUserId);
    if (!target) return;
    getIO().to(target.socketId).emit("huddle:offer", { fromUserId: userId, sdp });
  });

  socket.on("huddle:answer", ({ roomId, toUserId, sdp }) => {
    const target = huddleRooms.get(roomKey(roomId))?.get(toUserId);
    if (!target) return;
    getIO().to(target.socketId).emit("huddle:answer", { fromUserId: userId, sdp });
  });

  socket.on("huddle:ice", ({ roomId, toUserId, candidate }) => {
    const target = huddleRooms.get(roomKey(roomId))?.get(toUserId);
    if (!target) return;
    getIO().to(target.socketId).emit("huddle:ice", { fromUserId: userId, candidate });
  });

  socket.on("huddle:mute", ({ roomId, muted }) => {
    const key = roomKey(roomId);
    const participant = huddleRooms.get(key)?.get(userId);
    if (!participant) return;
    participant.muted = muted;

    getIO().to(key).emit("huddle:state", {
      roomId,
      participants: getParticipants(key),
    });
  });

  socket.on("huddle:hand", ({ roomId, raised }) => {
    const key = roomKey(roomId);
    const participant = huddleRooms.get(key)?.get(userId);
    if (!participant) return;
    participant.handRaised = raised;

    getIO().to(key).emit("huddle:state", {
      roomId,
      participants: getParticipants(key),
    });
  });

  socket.on("disconnect", () => {
    for (const [key, participants] of huddleRooms.entries()) {
      if (participants.has(userId)) {
        const match = key.match(/^ws:[^:]+:huddle:(.+)$/);
        const roomId = match ? match[1] : key;
        leaveHuddle(roomId);
      }
    }
  });
};
