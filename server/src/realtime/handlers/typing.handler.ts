import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@nebula/shared";
import { consume } from "../socketRateLimit";

type NebServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type NebSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Maps roomKey → Set of userIds currently typing
const typingStore = new Map<string, Set<string>>();

/** Returns a consistent key for a track or DM conversation */
const getKey = (payload: { trackId?: string; dmKey?: string }): string | null => {
  if (payload.trackId) return `track:${payload.trackId}`;
  if (payload.dmKey) return `dm:${payload.dmKey}`;
  return null;
};

const broadcastTyping = (
  io: NebServer,
  key: string,
  trackId?: string,
  dmKey?: string
) => {
  const userIds = Array.from(typingStore.get(key) ?? []);
  // Track indicators scope to that track's room. DM indicators go to the
  // sockets of the two participants only.
  if (trackId) {
    io.to(`track:${trackId}`).emit("typing:update", { trackId, userIds });
    return;
  }
  if (dmKey) {
    const [a, b] = dmKey.split("|");
    if (a) io.to(`user:${a}`).emit("typing:update", { dmKey, userIds });
    if (b && b !== a) io.to(`user:${b}`).emit("typing:update", { dmKey, userIds });
  }
};

export const registerTypingHandlers = (io: NebServer, socket: NebSocket) => {
  const userId = socket.data.userId;

  socket.on("typing:start", (payload) => {
    // Typing can fire on every keystroke — keep the bucket loose
    if (!consume(socket.id, "typing", { capacity: 20, ratePerSec: 10 })) return;

    const key = getKey(payload);
    if (!key) return;

    if (!typingStore.has(key)) typingStore.set(key, new Set());
    typingStore.get(key)!.add(userId);

    broadcastTyping(io, key, payload.trackId, payload.dmKey);
  });

  socket.on("typing:stop", (payload) => {
    const key = getKey(payload);
    if (!key) return;

    const set = typingStore.get(key);
    if (!set) return;
    set.delete(userId);
    if (set.size === 0) typingStore.delete(key);

    broadcastTyping(io, key, payload.trackId, payload.dmKey);
  });

  // Auto-stop on disconnect
  socket.on("disconnect", () => {
    for (const [key, users] of typingStore.entries()) {
      if (!users.has(userId)) continue;
      users.delete(userId);
      if (users.size === 0) typingStore.delete(key);
      const [type, id] = key.split(":");
      broadcastTyping(
        io,
        key,
        type === "track" ? id : undefined,
        type === "dm" ? id : undefined
      );
    }
  });
};
