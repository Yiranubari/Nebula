// Users
export type { User, Role, Workspace } from "./user.types";

// Tasks
export {
  TaskStatus,
  Priority,
} from "./task.types";
export type { Task, ProjectSuggestion } from "./task.types";

// Messages & Attachments
export type { Message, Attachment } from "./message.types";

// Tracks
export type { Track } from "./track.types";

// Direct Messages
export type { DirectMessage, DMStatus } from "./dm.types";

// Notifications
export type {
  Notification,
  NotificationStatus,
  NotificationType,
} from "./notification.types";

// Presence & Typing
export type {
  PresenceStatus,
  PresenceInfo,
  PresenceMap,
  TypingByTrack,
  TypingByDm,
} from "./presence.types";

// Socket.IO typed events
export type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  HuddleParticipant,
} from "./socket.events";
