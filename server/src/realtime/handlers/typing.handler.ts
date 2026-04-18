import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@nebula/shared";

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
  io.emit("typing:update", { trackId, dmKey, userIds });
};

export const registerTypingHandlers = (io: NebServer, socket: NebSocket) => {
  const userId = socket.data.userId;

  socket.on("typing:start", (payload) => {
    const key = getKey(payload);
    if (!key) return;

    if (!typingStore.has(key)) typingStore.set(key, new Set());
    typingStore.get(key)!.add(userId);

    broadcastTyping(io, key, payload.trackId, payload.dmKey);
  });

  socket.on("typing:stop", (payload) => {
    const key = getKey(payload);
    if (!key) return;

    typingStore.get(key)?.delete(userId);

    broadcastTyping(io, key, payload.trackId, payload.dmKey);
  });

  // Auto-stop on disconnect
  socket.on("disconnect", () => {
    // Scan all keys and remove user
    for (const [key, users] of typingStore.entries()) {
      if (users.has(userId)) {
        users.delete(userId);
        const [type, id] = key.split(":");
        broadcastTyping(
          io,
          key,
          type === "track" ? id : undefined,
          type === "dm" ? id : undefined
        );
      }
    }
  });
};
