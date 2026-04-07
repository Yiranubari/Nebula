import type { Attachment } from "./message.types";

export type DMStatus = "sent" | "failed";

export interface DirectMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  reactions?: Record<string, string[]>;
  readBy?: string[];
  status?: DMStatus;
}
