/**
 * Unit tests for tasksService — all axios calls are mocked.
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

import { tasksService } from "@/services/tasks.service";
import { api } from "@/services/api";

const mockApi = api as any;

const baseTask = {
  id: "t1",
  title: "Fix bug",
  status: "TODO",
  priority: "MEDIUM",
  createdAt: new Date().toISOString(),
};

beforeEach(() => vi.clearAllMocks());

describe("tasksService.list", () => {
  it("returns tasks array from API", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { tasks: [baseTask] } });
    const result = await tasksService.list();
    expect(result).toEqual([baseTask]);
    expect(mockApi.get).toHaveBeenCalledWith("/tasks", { params: undefined });
  });

  it("passes filter params to API", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { tasks: [] } });
    await tasksService.list({ status: "DONE" });
    expect(mockApi.get).toHaveBeenCalledWith("/tasks", { params: { status: "DONE" } });
  });
});

describe("tasksService.create", () => {
  it("POSTs to /tasks and returns created task", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { task: baseTask } });
    const result = await tasksService.create({ title: "Fix bug" });
    expect(result).toEqual(baseTask);
    expect(mockApi.post).toHaveBeenCalledWith("/tasks", { title: "Fix bug" });
  });
});

describe("tasksService.update", () => {
  it("PATCHes the correct task endpoint", async () => {
    const updated = { ...baseTask, title: "Fixed" };
    mockApi.patch.mockResolvedValueOnce({ data: { task: updated } });
    const result = await tasksService.update("t1", { title: "Fixed" });
    expect(result.title).toBe("Fixed");
    expect(mockApi.patch).toHaveBeenCalledWith("/tasks/t1", { title: "Fixed" });
  });
});

describe("tasksService.delete", () => {
  it("calls DELETE on the correct endpoint", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: {} });
    await tasksService.delete("t1");
    expect(mockApi.delete).toHaveBeenCalledWith("/tasks/t1");
  });
});
