import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));

import { usersService } from "@/services/users.service";
import { api } from "@/services/api";

const mockApi = api as any;

const baseUser = {
  id: "u1",
  name: "Alice",
  email: "alice@test.com",
  role: "MEMBER",
  avatar: null,
};

beforeEach(() => vi.clearAllMocks());

describe("usersService.list", () => {
  it("fetches from /users and returns array", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { users: [baseUser] } });
    const result = await usersService.list();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u1");
    expect(mockApi.get).toHaveBeenCalledWith("/users");
  });
});

describe("usersService.getMe", () => {
  it("fetches from /users/me", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { user: baseUser } });
    const result = await usersService.getMe();
    expect(result.email).toBe("alice@test.com");
    expect(mockApi.get).toHaveBeenCalledWith("/users/me");
  });
});

describe("usersService.updateMe", () => {
  it("PATCHes /users/me with the payload", async () => {
    const updated = { ...baseUser, name: "Alicia" };
    mockApi.patch.mockResolvedValueOnce({ data: { user: updated } });
    const result = await usersService.updateMe({ name: "Alicia" });
    expect(result.name).toBe("Alicia");
    expect(mockApi.patch).toHaveBeenCalledWith("/users/me", { name: "Alicia" });
  });
});

describe("usersService.delete", () => {
  it("calls DELETE /users/:id", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: {} });
    await usersService.delete("u1");
    expect(mockApi.delete).toHaveBeenCalledWith("/users/u1");
  });
});
