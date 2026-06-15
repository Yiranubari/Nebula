import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));

import { messagesService } from "@/services/messages.service";
import { api } from "@/services/api";

const mockApi = api as any;

const baseMessage = {
  id: "m1",
  content: "Hello world",
  userId: "u1",
  trackId: "tr1",
  createdAt: new Date().toISOString(),
};

beforeEach(() => vi.clearAllMocks());

describe("messagesService.send", () => {
  it("POSTs to /messages/tracks/:trackId", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { message: baseMessage } });
    const result = await messagesService.send({ trackId: "tr1", content: "Hello world" });
    expect(result.content).toBe("Hello world");
    expect(mockApi.post).toHaveBeenCalledWith(
      "/messages/tracks/tr1",
      { content: "Hello world", parentId: undefined, attachments: undefined }
    );
  });
});

describe("messagesService.edit", () => {
  it("PATCHes /messages/:id", async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { message: { ...baseMessage, content: "Updated" } } });
    const result = await messagesService.edit("m1", { content: "Updated" });
    expect(result.content).toBe("Updated");
    expect(mockApi.patch).toHaveBeenCalledWith("/messages/m1", { content: "Updated" });
  });
});

describe("messagesService.delete", () => {
  it("DELETEs /messages/:id", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: {} });
    await messagesService.delete("m1");
    expect(mockApi.delete).toHaveBeenCalledWith("/messages/m1");
  });
});

describe("messagesService.pin", () => {
  it("PATCHes /messages/:id/pin", async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { message: { ...baseMessage, pinned: true } } });
    const result = await messagesService.pin("m1", true);
    expect(result.pinned).toBe(true);
    expect(mockApi.patch).toHaveBeenCalledWith("/messages/m1/pin", { pinned: true });
  });
});
