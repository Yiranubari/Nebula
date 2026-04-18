import type { Message } from "./message.types";
import type { DirectMessage } from "./dm.types";
import type { Notification } from "./notification.types";
import type { PresenceStatus, PresenceInfo } from "./presence.types";


export interface ClientToServerEvents {
  "presence:set": (payload: { status: PresenceStatus }) => void;

  "typing:start": (payload: { trackId?: string; dmKey?: string }) => void;
  "typing:stop": (payload: { trackId?: string; dmKey?: string }) => void;

  "message:send": (payload: {
    trackId: string;
    content: string;
    parentId?: string;
    attachments?: Array<{ name: string; size: number; type: string; url: string }>;
  }) => void;
  "message:react": (payload: { messageId: string; emoji: string }) => void;
  "message:read": (payload: { messageId: string }) => void;
  "message:pin": (payload: { messageId: string; pinned: boolean }) => void;

  "dm:send": (payload: {
    toUserId: string;
    content: string;
    attachments?: Array<{ name: string; size: number; type: string; url: string }>;
  }) => void;
  "dm:react": (payload: { messageId: string; emoji: string }) => void;

  "huddle:join": (payload: { roomId: string }) => void;
  "huddle:leave": (payload: { roomId: string }) => void;
  "huddle:offer": (payload: { roomId: string; toUserId: string; sdp: RTCSessionDescriptionInit }) => void;
  "huddle:answer": (payload: { roomId: string; toUserId: string; sdp: RTCSessionDescriptionInit }) => void;
  "huddle:ice": (payload: { roomId: string; toUserId: string; candidate: RTCIceCandidateInit }) => void;
  "huddle:mute": (payload: { roomId: string; muted: boolean }) => void;
  "huddle:hand": (payload: { roomId: string; raised: boolean }) => void;
}


export interface HuddleParticipant {
  userId: string;
  muted: boolean;
  handRaised: boolean;
}

export interface ServerToClientEvents {
  // Presence
  "presence:update": (payload: {
    userId: string;
    info: PresenceInfo;
  }) => void;

  /** Initial full presence snapshot sent to a socket when it connects. */
  "presence:snapshot": (payload: {
    presence: Record<string, PresenceInfo>;
  }) => void;

  // Typing
  "typing:update": (payload: {
    trackId?: string;
    dmKey?: string;
    userIds: string[];
  }) => void;

  // Track messages
  "message:new": (message: Message) => void;
  "message:updated": (message: Message) => void;

  // Direct messages
  "dm:new": (message: DirectMessage) => void;
  "dm:updated": (message: DirectMessage) => void;

  // Notifications
  "notification:new": (notification: Notification) => void;

  // Huddle / WebRTC signalling (server relays these between peers)
  "huddle:user-joined": (payload: { roomId: string; userId: string; participants: HuddleParticipant[] }) => void;
  "huddle:user-left": (payload: { roomId: string; userId: string; participants: HuddleParticipant[] }) => void;
  "huddle:state": (payload: { roomId: string; participants: HuddleParticipant[] }) => void;
  "huddle:offer": (payload: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => void;
  "huddle:answer": (payload: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => void;
  "huddle:ice": (payload: { fromUserId: string; candidate: RTCIceCandidateInit }) => void;
}

// ─── Inter-server events (Socket.IO cluster support, future use) ────────────
export interface InterServerEvents {
  ping: () => void;
}

// ─── Per-socket data ────────────────────────────────────────────────────────
export interface SocketData {
  userId: string;
  userName: string;
  role: "ADMIN" | "MEMBER";
}
