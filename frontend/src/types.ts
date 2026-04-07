export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW",
  DONE = "DONE",
}

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface User {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  avatar: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  createdAt: string;
  estimatedHours: number;
  dueDate?: string;
  labels?: string[];
}

export interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  // Optional track association; defaults to general if absent
  trackId?: string;
  // Optional parent message id for threaded replies
  parentId?: string;
  // Whether this message is pinned in its track
  pinned?: boolean;
  // Optional attachments (images, audio, video, files)
  attachments?: Attachment[];
  // Emoji reactions: key = emoji, value = array of userIds who reacted
  reactions?: Record<string, string[]>;
  // Track who has read this message (user IDs)
  readBy?: string[];
}

export interface ProjectSuggestion {
  title: string;
  description: string;
  priority: Priority;
  estimatedHours: number;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string; // MIME type
  url: string; // Data URL or remote URL
}

export interface Track {
  id: string;
  name: string;
  createdAt: string;
  members: string[];
}

export type NotificationStatus = "PENDING" | "APPROVED" | "REJECTED" | "INFO";

export interface Notification {
  id: string;
  // Task-related notifications
  taskId?: string;
  // Chat-related notifications
  messageId?: string;
  trackId?: string;
  // For reaction notifications, include the emoji used
  emoji?: string;
  requesterId: string;
  recipientId?: string;
  createdAt: string;
  status: NotificationStatus;
  type?: "APPROVAL_REQUEST" | "ASSIGNED" | "MENTION" | "REACTION";
  // Unread indicator for badge counts and inbox
  read?: boolean;
}

export interface DirectMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  // Emoji reactions: emoji -> userIds
  reactions?: Record<string, string[]>;
  // Track who has read this DM (user IDs)
  readBy?: string[];
  // Delivery state; failed indicates send error
  status?: "sent" | "failed";
}

// Presence types for online indicators, typing, and huddle badges
export type PresenceStatus = "online" | "idle" | "offline";

export interface PresenceInfo {
  status: PresenceStatus;
  lastActive: string;
  inHuddleTrackId?: string | null;
}

export type PresenceMap = Record<string, PresenceInfo>; // key: userId

export type TypingByTrack = Record<string, string[]>; // key: trackId -> userIds typing

// DM typing indicators, keyed by a stable thread key (e.g. "u1|u2")
export type TypingByDm = Record<string, string[]>;
