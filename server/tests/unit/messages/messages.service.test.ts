import { describe, it, expect, beforeEach } from "vitest";
import { MessagesService } from "../../../src/modules/messages/messages.service";
import { prismaMock, resetPrismaMocks } from "../../helpers/prisma-mock";
import { AppError } from "../../../src/utils/AppError";

const service = new MessagesService(prismaMock as any);

const WS = "ws1";

const baseMessage = {
  id: "m1",
  workspaceId: WS,
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

const mockTrackInWorkspace = (hit = true) => {
  prismaMock.track.findFirst.mockResolvedValueOnce(
    hit ? { id: "track1" } : null
  );
};

describe("MessagesService.sendMessage", () => {
  it("throws 404 if track is not in this workspace", async () => {
    mockTrackInWorkspace(false);
    await expect(
      service.sendMessage("u1", "MEMBER", WS, "track1", { content: "Hi" } as any)
    ).rejects.toThrow(AppError);
  });

  it("throws 403 if user is not a track member", async () => {
    mockTrackInWorkspace(true);
    prismaMock.trackMember.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.sendMessage("u1", "MEMBER", WS, "track1", { content: "Hi" } as any)
    ).rejects.toThrow(AppError);
  });

  it("creates message for valid track member", async () => {
    mockTrackInWorkspace(true);
    prismaMock.trackMember.findUnique.mockResolvedValueOnce({
      trackId: "track1",
      userId: "u1",
    });
    prismaMock.message.create.mockResolvedValueOnce(baseMessage);

    const result = await service.sendMessage(
      "u1",
      "MEMBER",
      WS,
      "track1",
      { content: "Hello" } as any
    );
    expect(result.content).toBe("Hello");
    expect(prismaMock.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workspaceId: WS }),
      })
    );
  });
});

describe("MessagesService.getMessages", () => {
  it("throws 403 if user is not a track member", async () => {
    mockTrackInWorkspace(true);
    prismaMock.trackMember.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.getMessages("u1", "MEMBER", WS, "track1")
    ).rejects.toThrow(AppError);
  });

  it("returns paginated messages with cursor", async () => {
    mockTrackInWorkspace(true);
    prismaMock.trackMember.findUnique.mockResolvedValueOnce({
      trackId: "track1",
      userId: "u1",
    });
    prismaMock.message.findMany.mockResolvedValueOnce([
      baseMessage,
      { ...baseMessage, id: "m2" },
    ]);

    const result = await service.getMessages("u1", "MEMBER", WS, "track1", 1);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe("m2");
  });
});

describe("MessagesService.editMessage", () => {
  it("throws 404 if message does not exist in workspace", async () => {
    prismaMock.message.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.editMessage("u1", WS, "m1", { content: "Updated" })
    ).rejects.toThrow(AppError);
  });

  it("throws 403 if user is not the message author", async () => {
    prismaMock.message.findFirst.mockResolvedValueOnce({ ...baseMessage, userId: "u2" });
    await expect(
      service.editMessage("u1", WS, "m1", { content: "Updated" })
    ).rejects.toThrow(AppError);
  });

  it("updates message content", async () => {
    prismaMock.message.findFirst.mockResolvedValueOnce(baseMessage);
    prismaMock.message.update.mockResolvedValueOnce({ ...baseMessage, content: "Updated" });

    const result = await service.editMessage("u1", WS, "m1", { content: "Updated" });
    expect(result.content).toBe("Updated");
  });
});

describe("MessagesService.deleteMessage", () => {
  it("throws 403 if user does not own the message", async () => {
    prismaMock.message.findFirst.mockResolvedValueOnce({ ...baseMessage, userId: "u2" });
    await expect(service.deleteMessage("u1", WS, "m1")).rejects.toThrow(AppError);
  });

  it("deletes message when user is author", async () => {
    prismaMock.message.findFirst.mockResolvedValueOnce(baseMessage);
    prismaMock.message.delete.mockResolvedValueOnce(baseMessage);
    await service.deleteMessage("u1", WS, "m1");
    expect(prismaMock.message.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
  });
});
