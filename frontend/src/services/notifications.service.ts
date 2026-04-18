import { api } from "./api";
import type { Notification, NotificationStatus } from "@nebula/shared";

export interface UpdateNotificationPayload {
  read?: boolean;
  status?: NotificationStatus;
}

export const notificationsService = {
  list: async (): Promise<Notification[]> => {
    const { data } = await api.get("/notifications");
    return data.notifications ?? data;
  },

  update: async (
    id: string,
    payload: UpdateNotificationPayload
  ): Promise<Notification> => {
    const { data } = await api.patch(`/notifications/${id}`, payload);
    return data.notification ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};
