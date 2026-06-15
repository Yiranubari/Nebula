export type NotificationStatus = "PENDING" | "APPROVED" | "REJECTED" | "INFO";

export type NotificationType =
  | "APPROVAL_REQUEST"
  | "ASSIGNED"
  | "MENTION"
  | "REACTION";

export interface Notification {
  id: string;
  taskId?: string;
  messageId?: string;
  trackId?: string;
  emoji?: string;
  requesterId: string;
  recipientId?: string;
  createdAt: string;
  status: NotificationStatus;
  type?: NotificationType;
  read?: boolean;
}
