import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  PresenceInfo,
  PresenceStatus,
} from "@nebula/shared";

type NebServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

interface InternalPresence {
  status: PresenceStatus;
  lastActive: string;
  inHuddleTrackId: string | null;
  workspaceId: string;
  connections: Set<string>;
}

const store = new Map<string, InternalPresence>();

export function ensurePresence(
  userId: string,
  workspaceId: string
): InternalPresence {
  const existing = store.get(userId);
  if (existing) {
    existing.workspaceId = workspaceId;
    return existing;
  }
  const fresh: InternalPresence = {
    status: "offline",
    lastActive: new Date().toISOString(),
    inHuddleTrackId: null,
    workspaceId,
    connections: new Set(),
  };
  store.set(userId, fresh);
  return fresh;
}

export function getPresence(userId: string): InternalPresence | undefined {
  return store.get(userId);
}

export function deletePresence(userId: string): void {
  store.delete(userId);
}

export function snapshot(workspaceId: string): Record<string, PresenceInfo> {
  const out: Record<string, PresenceInfo> = {};
  for (const [userId, p] of store.entries()) {
    if (p.workspaceId !== workspaceId) continue;
    out[userId] = {
      status: p.status,
      lastActive: p.lastActive,
      inHuddleTrackId: p.inHuddleTrackId ?? null,
    };
  }
  return out;
}

export function broadcastPresence(io: NebServer, userId: string): void {
  const p = store.get(userId);
  if (!p) return;
  io.to(`ws:${p.workspaceId}`).emit("presence:update", {
    userId,
    info: {
      status: p.status,
      lastActive: p.lastActive,
      inHuddleTrackId: p.inHuddleTrackId ?? null,
    },
  });
}

export function setInHuddle(
  io: NebServer,
  userId: string,
  workspaceId: string,
  trackId: string | null
): void {
  const p = ensurePresence(userId, workspaceId);
  if (p.inHuddleTrackId === trackId) return;
  p.inHuddleTrackId = trackId;
  p.lastActive = new Date().toISOString();
  broadcastPresence(io, userId);
}
