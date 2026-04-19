import { BaseService } from "../../core/BaseService";
import { UpdateNotificationDto } from "./notifications.schemas";
import { AppError } from "../../utils/AppError";

export class NotificationsService extends BaseService {
  async getMyNotifications(userId: string, workspaceId: string) {
    return this.prisma.notification.findMany({
      where: { workspaceId, recipientId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateNotification(
    userId: string,
    workspaceId: string,
    notificationId: string,
    data: UpdateNotificationDto
  ) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, workspaceId },
    });

    if (!notification) throw new AppError(404, "Notification not found");
    if (notification.recipientId !== userId) {
      throw new AppError(
        403,
        "You do not have permission to update this notification"
      );
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data,
    });
  }

  async deleteNotification(
    userId: string,
    workspaceId: string,
    notificationId: string
  ) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, workspaceId },
    });

    if (!notification) throw new AppError(404, "Notification not found");
    if (notification.recipientId !== userId) {
      throw new AppError(
        403,
        "You do not have permission to delete this notification"
      );
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async markAllRead(userId: string, workspaceId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { workspaceId, recipientId: userId, read: false },
      data: { read: true },
    });
    return { updated: count };
  }
}
