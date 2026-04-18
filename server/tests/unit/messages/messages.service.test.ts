import { describe, it, expect, beforeEach } from "vitest";
import { MessagesService } from "../../../src/modules/messages/messages.service";
import { prismaMock, resetPrismaMocks } from "../../helpers/prisma-mock";
import { AppError } from "../../../src/utils/AppError";

const service = new MessagesService(prismaMock as any);

const baseMessage = {
  id: "m1",
  content: "Hello",
  userId: "u1",
  trackId: "track1",
  parentId: null,
  pinned: false,
  attachments: null,
  reactions: null,
  readBy: ["u1"],
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: "u1", name: "Alice", avatar: null },
};

beforeEach(() => resetPrismaMocks());

describe("MessagesService.sendMessage", () => {
  it("throws 403 if user is not a track member", async () => {
    prismaMock.trackMember.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.sendMessage("u1", "track1", { content: "Hi" })
    ).rejects.toThrow(AppError);
  });

  it("creates message for valid track member", async () => {
    prismaMock.trackMember.findUnique.mockResolvedValueOnce({ trackId: "track1", userId: "u1" });
    prismaMock.message.create.mockResolvedValueOnce(baseMessage);

    const result = await service.sendMessage("u1", "track1", { content: "Hello" });
    expect(result.content).toBe("Hello");
    expect(prismaMock.message.create).toHaveBeenCalledOnce();
  });
});

describe("MessagesService.getMessages", () => {
  it("throws 403 if user is not a track member", async () => {
    prismaMock.trackMember.findUnique.mockResolvedValueOnce(null);
    await expect(service.getMessages("u1", "track1")).rejects.toThrow(AppError);
  });

  it("returns paginated messages with cursor", async () => {
    prismaMock.trackMember.findUnique.mockResolvedValueOnce({ trackId: "track1", userId: "u1" });
    prismaMock.message.findMany.mockResolvedValueOnce([baseMessage, { ...baseMessage, id: "m2" }]);

    const result = await service.getMessages("u1", "track1", 1);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe("m2");
  });
});

describe("MessagesService.editMessage", () => {
  it("throws 404 if message does not exist", async () => {
    prismaMock.message.findUnique.mockResolvedValueOnce(null);
    await expect(service.editMessage("u1", "m1", { content: "Updated" })).rejects.toThrow(AppError);
  });

  it("throws 403 if user is not the message author", async () => {
    prismaMock.message.findUnique.mockResolvedValueOnce({ ...baseMessage, userId: "u2" });
    await expect(service.editMessage("u1", "m1", { content: "Updated" })).rejects.toThrow(AppError);
  });

  it("updates message content", async () => {
    prismaMock.message.findUnique.mockResolvedValueOnce(baseMessage);
    prismaMock.message.update.mockResolvedValueOnce({ ...baseMessage, content: "Updated" });

    const result = await service.editMessage("u1", "m1", { content: "Updated" });
    expect(result.content).toBe("Updated");
  });
});

describe("MessagesService.deleteMessage", () => {
  it("throws 403 if user does not own the message", async () => {
    prismaMock.message.findUnique.mockResolvedValueOnce({ ...baseMessage, userId: "u2" });
    await expect(service.deleteMessage("u1", "m1")).rejects.toThrow(AppError);
  });

  it("deletes message when user is author", async () => {
    prismaMock.message.findUnique.mockResolvedValueOnce(baseMessage);
    prismaMock.message.delete.mockResolvedValueOnce(baseMessage);
    await service.deleteMessage("u1", "m1");
    expect(prismaMock.message.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
  });
});
