export type PresenceStatus = "online" | "idle" | "offline";

export interface PresenceInfo {
  status: PresenceStatus;
  lastActive: string;
  inHuddleTrackId?: string | null;
}

/** key: userId → PresenceInfo */
export type PresenceMap = Record<string, PresenceInfo>;

/** key: trackId → array of userIds who are typing */
export type TypingByTrack = Record<string, string[]>;

/** key: dm thread key (e.g. "u1|u2") → array of userIds who are typing */
export type TypingByDm = Record<string, string[]>;
