/**
 * Unit tests for dmService — all axios calls are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));

import { dmService } from "@/services/dm.service";
import { api } from "@/services/api";

const mockApi = api as any;

const baseDm = {
  id: "dm1",
  fromUserId: "u1",
  toUserId: "u2",
  content: "Hello!",
  createdAt: new Date().toISOString(),
};

beforeEach(() => vi.clearAllMocks());

describe("dmService.getHistory", () => {
  it("fetches DM history from /dm/:withUserId", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { items: [baseDm], nextCursor: undefined } });
    const result = await dmService.getHistory("u2");
    expect(result.items).toHaveLength(1);
    expect(mockApi.get).toHaveBeenCalledWith(
      "/dm/u2",
      { params: { cursor: undefined, limit: 50 } }
    );
  });

  it("passes cursor for pagination", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { items: [], nextCursor: undefined } });
    await dmService.getHistory("u2", "cursor123", 20);
    expect(mockApi.get).toHaveBeenCalledWith(
      "/dm/u2",
      { params: { cursor: "cursor123", limit: 20 } }
    );
  });
});

describe("dmService.delete", () => {
  it("DELETEs the DM by id", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: {} });
    await dmService.delete("dm1");
    expect(mockApi.delete).toHaveBeenCalledWith("/dm/dm1");
  });
});
