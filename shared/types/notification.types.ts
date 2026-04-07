export type NotificationStatus = "PENDING" | "APPROVED" | "REJECTED" | "INFO";

export type NotificationType =
  | "APPROVAL_REQUEST"
  | "ASSIGNED"
  | "MENTION"
  | "REACTION";

export interface Notification {
  id: string;
  /** Task-related notifications */
  taskId?: string;
  /** Chat-related notifications */
  messageId?: string;
  trackId?: string;
  /** For reaction notifications, include the emoji used */
  emoji?: string;
  requesterId: string;
  recipientId?: string;
  createdAt: string;
  status: NotificationStatus;
  type?: NotificationType;
  /** Unread indicator for badge counts and inbox */
  read?: boolean;
}
