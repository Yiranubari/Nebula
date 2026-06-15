export type PresenceStatus = "online" | "idle" | "offline";

export interface PresenceInfo {
  status: PresenceStatus;
  lastActive: string;
  inHuddleTrackId?: string | null;
}

export type PresenceMap = Record<string, PresenceInfo>;

export type TypingByTrack = Record<string, string[]>;

export type TypingByDm = Record<string, string[]>;
