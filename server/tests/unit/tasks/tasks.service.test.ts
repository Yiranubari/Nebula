import { describe, it, expect, beforeEach } from "vitest";
import { TasksService } from "../../../src/modules/tasks/tasks.service";
import { prismaMock, resetPrismaMocks } from "../../helpers/prisma-mock";
import { AppError } from "../../../src/utils/AppError";

const service = new TasksService(prismaMock as any);

const WS = "ws1";

const baseTask = {
  id: "t1",
  workspaceId: WS,
  title: "Fix bug",
  description: "Details",
  status: "TODO" as const,
  priority: "MEDIUM" as const,
  assigneeId: "u2",
  estimatedHours: 2,
  dueDate: null,
  labels: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  assignee: { id: "u2", name: "Bob", avatar: null },
};

beforeEach(() => resetPrismaMocks());

describe("TasksService.createTask", () => {
  it("creates task and generates ASSIGNED notification", async () => {
    // Workspace check on the assignee
    prismaMock.user.findUnique.mockResolvedValueOnce({ workspaceId: WS });
    prismaMock.task.create.mockResolvedValueOnce(baseTask);
    prismaMock.notification.create.mockResolvedValueOnce({});

    const result = await service.createTask("u1", WS, {
      title: "Fix bug",
      description: "Details",
      assigneeId: "u2",
    } as any);

    expect(result.id).toBe("t1");
    expect(prismaMock.notification.create).toHaveBeenCalledOnce();
    // Workspace stamped on the create
    expect(prismaMock.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workspaceId: WS }),
      })
    );
  });

  it("does NOT create notification when no assignee", async () => {
    prismaMock.task.create.mockResolvedValueOnce({ ...baseTask, assigneeId: null });
    await service.createTask("u1", WS, { title: "No assignee" } as any);
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  it("rejects assignee from a different workspace", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ workspaceId: "other-ws" });
    await expect(
      service.createTask("u1", WS, { title: "x", assigneeId: "u-other" } as any)
    ).rejects.toThrow(AppError);
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });
});

describe("TasksService.getTasks", () => {
  it("returns list of tasks scoped to workspace", async () => {
    prismaMock.task.findMany.mockResolvedValueOnce([baseTask]);
    const result = await service.getTasks(WS, {});
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Fix bug");
    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WS } })
    );
  });

  it("passes status filter to Prisma along with workspaceId", async () => {
    prismaMock.task.findMany.mockResolvedValueOnce([]);
    await service.getTasks(WS, { status: "DONE" as any });
    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WS, status: "DONE" } })
    );
  });
});

describe("TasksService.getTaskById", () => {
  it("throws 404 if task not found in this workspace", async () => {
    prismaMock.task.findFirst.mockResolvedValueOnce(null);
    await expect(service.getTaskById(WS, "nonexistent")).rejects.toThrow(AppError);
    expect(prismaMock.task.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "nonexistent", workspaceId: WS },
      })
    );
  });
});

describe("TasksService.updateTask", () => {
  it("updates task and notifies new assignee", async () => {
    // getTaskById (findFirst) returns existing task
    prismaMock.task.findFirst.mockResolvedValueOnce(baseTask);
    // assignee workspace check
    prismaMock.user.findUnique.mockResolvedValueOnce({ workspaceId: WS });
    prismaMock.task.update.mockResolvedValueOnce({ ...baseTask, assigneeId: "u3" });
    prismaMock.notification.create.mockResolvedValueOnce({});

    await service.updateTask("u1", "ADMIN", WS, "t1", { assigneeId: "u3" } as any);
    expect(prismaMock.notification.create).toHaveBeenCalledOnce();
  });

  it("rejects non-admin non-assignee", async () => {
    prismaMock.task.findFirst.mockResolvedValueOnce(baseTask);
    await expect(
      service.updateTask("u-other", "MEMBER", WS, "t1", { status: "DONE" } as any)
    ).rejects.toThrow(AppError);
  });
});

describe("TasksService.deleteTask", () => {
  it("deletes task after confirming existence (admin)", async () => {
    prismaMock.task.findFirst.mockResolvedValueOnce(baseTask);
    prismaMock.task.delete.mockResolvedValueOnce(baseTask);
    await service.deleteTask("u1", "ADMIN", WS, "t1");
    expect(prismaMock.task.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });

  it("rejects member role", async () => {
    prismaMock.task.findFirst.mockResolvedValueOnce(baseTask);
    await expect(service.deleteTask("u1", "MEMBER", WS, "t1")).rejects.toThrow(AppError);
  });
});
