export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  trackId?: string;
  parentId?: string;
  pinned?: boolean;
  attachments?: Attachment[];
  reactions?: Record<string, string[]>;
  readBy?: string[];
}
