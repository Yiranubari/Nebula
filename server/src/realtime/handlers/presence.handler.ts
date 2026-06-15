import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@nebula/shared";
import {
  ensurePresence,
  getPresence,
  deletePresence,
  broadcastPresence,
  snapshot,
} from "../presenceStore";

type NebServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type NebSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export const registerPresenceHandlers = (io: NebServer, socket: NebSocket) => {
  const { userId, workspaceId } = socket.data;

  socket.emit("presence:snapshot", { presence: snapshot(workspaceId) });

  const presence = ensurePresence(userId, workspaceId);
  presence.connections.add(socket.id);
  presence.status = "online";
  presence.lastActive = new Date().toISOString();
  broadcastPresence(io, userId);

  socket.on("presence:set", (payload) => {
    const p = getPresence(userId);
    if (!p) return;
    p.status = payload.status;
    p.lastActive = new Date().toISOString();
    broadcastPresence(io, userId);
  });

  socket.on("disconnect", () => {
    const p = getPresence(userId);
    if (!p) return;
    p.connections.delete(socket.id);
    if (p.connections.size > 0) return;

    p.status = "offline";
    p.inHuddleTrackId = null;
    p.lastActive = new Date().toISOString();
    broadcastPresence(io, userId);
    deletePresence(userId);
  });
};
