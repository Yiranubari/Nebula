/**
 * Unit tests for tracksService — all axios calls are mocked.
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

import { tracksService } from "@/services/tracks.service";
import { api } from "@/services/api";

const mockApi = api as any;

const rawTrack = {
  id: "tr1",
  name: "general",
  createdAt: new Date().toISOString(),
  members: [
    { userId: "u1", user: { id: "u1", name: "Alice", avatar: null } },
    { userId: "u2", user: { id: "u2", name: "Bob", avatar: null } },
  ],
};

const normalisedTrack = {
  id: "tr1",
  name: "general",
  createdAt: rawTrack.createdAt,
  members: ["u1", "u2"],
};

beforeEach(() => vi.clearAllMocks());

describe("tracksService.list", () => {
  it("fetches from /tracks and normalises members", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { tracks: [rawTrack] } });
    const result = await tracksService.list();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(normalisedTrack);
  });
});

describe("tracksService.create", () => {
  it("POSTs to /tracks and returns normalised track", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { track: rawTrack } });
    const result = await tracksService.create({ name: "general" });
    expect(result.members).toEqual(["u1", "u2"]);
    expect(mockApi.post).toHaveBeenCalledWith("/tracks", { name: "general" });
  });
});

describe("tracksService.addMember", () => {
  it("POSTs to /tracks/:id/members", async () => {
    mockApi.post.mockResolvedValueOnce({ data: {} });
    await tracksService.addMember("tr1", "u3");
    expect(mockApi.post).toHaveBeenCalledWith("/tracks/tr1/members", { userId: "u3" });
  });
});

describe("tracksService.removeMember", () => {
  it("DELETEs /tracks/:id/members/:userId", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: {} });
    await tracksService.removeMember("tr1", "u3");
    expect(mockApi.delete).toHaveBeenCalledWith("/tracks/tr1/members/u3");
  });
});

describe("tracksService.getMessages", () => {
  it("fetches from /messages/tracks/:id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { items: [], nextCursor: undefined } });
    const result = await tracksService.getMessages("tr1");
    expect(Array.isArray(result.items)).toBe(true);
    expect(mockApi.get).toHaveBeenCalledWith(
      "/messages/tracks/tr1",
      { params: { cursor: undefined, limit: 50 } }
    );
  });
});
