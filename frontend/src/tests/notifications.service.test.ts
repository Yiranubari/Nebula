import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));

import { notificationsService } from "@/services/notifications.service";
import { api } from "@/services/api";

const mockApi = api as any;

const baseNotif = {
  id: "n1",
  type: "ASSIGNED",
  read: false,
  status: "INFO",
  recipientId: "u2",
  requesterId: "u1",
  createdAt: new Date().toISOString(),
};

beforeEach(() => vi.clearAllMocks());

describe("notificationsService.list", () => {
  it("fetches from /notifications", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { notifications: [baseNotif] } });
    const result = await notificationsService.list();
    expect(result).toEqual([baseNotif]);
    expect(mockApi.get).toHaveBeenCalledWith("/notifications");
  });
});

describe("notificationsService.update", () => {
  it("PATCHes the notification with { read: true }", async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { notification: { ...baseNotif, read: true } } });
    const result = await notificationsService.update("n1", { read: true });
    expect(result.read).toBe(true);
    expect(mockApi.patch).toHaveBeenCalledWith("/notifications/n1", { read: true });
  });
});

describe("notificationsService.delete", () => {
  it("calls DELETE on the correct endpoint", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: {} });
    await notificationsService.delete("n1");
    expect(mockApi.delete).toHaveBeenCalledWith("/notifications/n1");
  });
});
