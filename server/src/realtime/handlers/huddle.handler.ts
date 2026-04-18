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

type NebServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type NebSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// In-memory huddle state
// Key: roomId → Map<userId, HuddleParticipant & { socketId }>
const huddleRooms = new Map<
  string,
  Map<string, HuddleParticipant & { socketId: string }>
>();

const getParticipants = (roomId: string): HuddleParticipant[] =>
  Array.from(huddleRooms.get(roomId)?.values() ?? []).map(
    ({ userId, muted, handRaised }) => ({ userId, muted, handRaised })
  );

export const registerHuddleHandlers = (_io: NebServer, socket: NebSocket) => {
  const userId = socket.data.userId;

  // ─── Join huddle room ────────────────────────────────────────────────────────
  socket.on("huddle:join", ({ roomId }) => {
    socket.join(`huddle:${roomId}`);

    if (!huddleRooms.has(roomId)) huddleRooms.set(roomId, new Map());
    huddleRooms.get(roomId)!.set(userId, {
      userId,
      muted: false,
      handRaised: false,
      socketId: socket.id,
    });

    const participants = getParticipants(roomId);

    // Send current room state to the new joiner
    socket.emit("huddle:state", { roomId, participants });

    // Tell everyone else a new user joined
    socket.to(`huddle:${roomId}`).emit("huddle:user-joined", {
      roomId,
      userId,
      participants,
    });

    logger.info(`${userId} joined huddle ${roomId}`);
  });

  // ─── Leave huddle room ───────────────────────────────────────────────────────
  const leaveHuddle = (roomId: string) => {
    huddleRooms.get(roomId)?.delete(userId);
    if (huddleRooms.get(roomId)?.size === 0) huddleRooms.delete(roomId);

    socket.leave(`huddle:${roomId}`);

    const participants = getParticipants(roomId);
    getIO().to(`huddle:${roomId}`).emit("huddle:user-left", {
      roomId,
      userId,
      participants,
    });
  };

  socket.on("huddle:leave", ({ roomId }) => {
    leaveHuddle(roomId);
    logger.info(`${userId} left huddle ${roomId}`);
  });

  // ─── WebRTC signaling relay ──────────────────────────────────────────────────
  socket.on("huddle:offer", ({ roomId, toUserId, sdp }) => {
    const target = huddleRooms.get(roomId)?.get(toUserId);
    if (!target) return;
    getIO().to(target.socketId).emit("huddle:offer", { fromUserId: userId, sdp });
  });

  socket.on("huddle:answer", ({ roomId, toUserId, sdp }) => {
    const target = huddleRooms.get(roomId)?.get(toUserId);
    if (!target) return;
    getIO().to(target.socketId).emit("huddle:answer", { fromUserId: userId, sdp });
  });

  socket.on("huddle:ice", ({ roomId, toUserId, candidate }) => {
    const target = huddleRooms.get(roomId)?.get(toUserId);
    if (!target) return;
    getIO().to(target.socketId).emit("huddle:ice", { fromUserId: userId, candidate });
  });

  // ─── Mute / hand raise ───────────────────────────────────────────────────────
  socket.on("huddle:mute", ({ roomId, muted }) => {
    const participant = huddleRooms.get(roomId)?.get(userId);
    if (!participant) return;
    participant.muted = muted;

    getIO().to(`huddle:${roomId}`).emit("huddle:state", {
      roomId,
      participants: getParticipants(roomId),
    });
  });

  socket.on("huddle:hand", ({ roomId, raised }) => {
    const participant = huddleRooms.get(roomId)?.get(userId);
    if (!participant) return;
    participant.handRaised = raised;

    getIO().to(`huddle:${roomId}`).emit("huddle:state", {
      roomId,
      participants: getParticipants(roomId),
    });
  });

  // ─── Auto-leave all huddles on disconnect ────────────────────────────────────
  socket.on("disconnect", () => {
    for (const [roomId, participants] of huddleRooms.entries()) {
      if (participants.has(userId)) {
        leaveHuddle(roomId);
      }
    }
  });
};
