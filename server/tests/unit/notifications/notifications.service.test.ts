import { describe, it, expect, beforeEach } from "vitest";
import { NotificationsService } from "../../../src/modules/notifications/notifications.service";
import { prismaMock, resetPrismaMocks } from "../../helpers/prisma-mock";
import { AppError } from "../../../src/utils/AppError";

const service = new NotificationsService(prismaMock as any);

const baseNotif = {
  id: "n1",
  type: "ASSIGNED" as const,
  taskId: "t1",
  messageId: null,
  trackId: null,
  emoji: null,
  requesterId: "u1",
  recipientId: "u2",
  status: "INFO" as const,
  read: false,
  createdAt: new Date(),
};

beforeEach(() => resetPrismaMocks());

describe("NotificationsService.getMyNotifications", () => {
  it("returns notifications for user", async () => {
    prismaMock.notification.findMany.mockResolvedValueOnce([baseNotif]);
    const result = await service.getMyNotifications("u2");
    expect(result).toHaveLength(1);
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientId: "u2" } })
    );
  });
});

describe("NotificationsService.updateNotification", () => {
  it("throws 404 if notification not found", async () => {
    prismaMock.notification.findUnique.mockResolvedValueOnce(null);
    await expect(service.updateNotification("u2", "bad-id", { read: true })).rejects.toThrow(AppError);
  });

  it("throws 403 if user is not recipient", async () => {
    prismaMock.notification.findUnique.mockResolvedValueOnce(baseNotif);
    await expect(service.updateNotification("u1", "n1", { read: true })).rejects.toThrow(AppError);
  });

  it("marks notification as read", async () => {
    prismaMock.notification.findUnique.mockResolvedValueOnce(baseNotif);
    prismaMock.notification.update.mockResolvedValueOnce({ ...baseNotif, read: true });
    const result = await service.updateNotification("u2", "n1", { read: true });
    expect(result.read).toBe(true);
  });
});

describe("NotificationsService.deleteNotification", () => {
  it("deletes notification when user is recipient", async () => {
    prismaMock.notification.findUnique.mockResolvedValueOnce(baseNotif);
    prismaMock.notification.delete.mockResolvedValueOnce(baseNotif);
    await service.deleteNotification("u2", "n1");
    expect(prismaMock.notification.delete).toHaveBeenCalledWith({ where: { id: "n1" } });
  });
});
