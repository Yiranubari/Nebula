import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  PresenceStatus,
  PresenceInfo,
} from "@nebula/shared";

type NebServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type NebSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// In-memory presence store
// Key: userId
const presenceStore = new Map<string, { status: PresenceStatus; lastActive: string; connections: Set<string> }>();

export const registerPresenceHandlers = (io: NebServer, socket: NebSocket) => {
  const userId = socket.data.userId;

  // Broadcast presence to all connected clients
  const broadcastPresence = (status: PresenceStatus) => {
    const info: PresenceInfo = {
      status,
      lastActive: presenceStore.get(userId)?.lastActive ?? new Date().toISOString(),
    };
    io.emit("presence:update", { userId, info });
  };

  // Initial connection logic
  let userPresence = presenceStore.get(userId);
  if (!userPresence) {
    userPresence = {
      status: "online",
      lastActive: new Date().toISOString(),
      connections: new Set([socket.id]),
    };
    presenceStore.set(userId, userPresence);
    broadcastPresence("online");
  } else {
    userPresence.connections.add(socket.id);
    userPresence.status = "online";
    userPresence.lastActive = new Date().toISOString();
    broadcastPresence("online");
  }

  // Handle explicit presence change (e.g. user sets themselves to "idle")
  socket.on("presence:set", (payload) => {
    const presence = presenceStore.get(userId);
    if (presence) {
      presence.status = payload.status;
      presence.lastActive = new Date().toISOString();
      broadcastPresence(payload.status);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const presence = presenceStore.get(userId);
    if (!presence) return;
    presence.connections.delete(socket.id);

    // Only go offline when all connections for this user drop
    if (presence.connections.size === 0) {
      presence.status = "offline";
      presence.lastActive = new Date().toISOString();
      broadcastPresence("offline");
      // Remove the entry entirely to avoid unbounded map growth for ephemeral users.
      presenceStore.delete(userId);
    }
  });
};
