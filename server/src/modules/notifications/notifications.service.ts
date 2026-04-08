import { BaseService } from "../../core/BaseService";
import { UpdateNotificationDto } from "./notifications.schemas";
import { AppError } from "../../utils/AppError";

export class NotificationsService extends BaseService {
  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateNotification(
    userId: string,
    notificationId: string,
    data: UpdateNotificationDto
  ) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
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

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
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
}
