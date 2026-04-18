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
  /** All active socket IDs belonging to this user (multi-tab / multi-device). */
  connections: Set<string>;
}

/**
 * Single source of truth for who's online, idle, or in a huddle. The presence
 * handler drives status transitions, the huddle handler drives
 * `inHuddleTrackId`, and any handler can broadcast updates with
 * `broadcastPresence`.
 */
const store = new Map<string, InternalPresence>();

export function ensurePresence(userId: string): InternalPresence {
  const existing = store.get(userId);
  if (existing) return existing;
  const fresh: InternalPresence = {
    status: "offline",
    lastActive: new Date().toISOString(),
    inHuddleTrackId: null,
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

/** Serialise the entire map to a `PresenceMap` shape for client consumption. */
export function snapshot(): Record<string, PresenceInfo> {
  const out: Record<string, PresenceInfo> = {};
  for (const [userId, p] of store.entries()) {
    out[userId] = {
      status: p.status,
      lastActive: p.lastActive,
      inHuddleTrackId: p.inHuddleTrackId ?? null,
    };
  }
  return out;
}

/** Emit a `presence:update` for a single user to every connected client. */
export function broadcastPresence(io: NebServer, userId: string): void {
  const p = store.get(userId);
  if (!p) return;
  io.emit("presence:update", {
    userId,
    info: {
      status: p.status,
      lastActive: p.lastActive,
      inHuddleTrackId: p.inHuddleTrackId ?? null,
    },
  });
}

/**
 * Mark a user as currently participating in (or leaving) a huddle. Updates the
 * presence record and broadcasts `presence:update` so every other client can
 * render the "in huddle" badge even if they're not in the huddle themselves.
 */
export function setInHuddle(
  io: NebServer,
  userId: string,
  trackId: string | null
): void {
  const p = ensurePresence(userId);
  if (p.inHuddleTrackId === trackId) return;
  p.inHuddleTrackId = trackId;
  p.lastActive = new Date().toISOString();
  broadcastPresence(io, userId);
}
