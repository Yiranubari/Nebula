export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string; // MIME type
  url: string;  // Data URL or remote URL
}

export interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  /** Optional track association; defaults to general if absent */
  trackId?: string;
  /** Optional parent message id for threaded replies */
  parentId?: string;
  /** Whether this message is pinned in its track */
  pinned?: boolean;
  /** Optional attachments (images, audio, video, files) */
  attachments?: Attachment[];
  /** Emoji reactions: key = emoji, value = array of userIds who reacted */
  reactions?: Record<string, string[]>;
  /** Track who has read this message (user IDs) */
  readBy?: string[];
}
