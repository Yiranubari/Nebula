import { describe, it, expect, beforeEach } from "vitest";
import { TasksService } from "../../../src/modules/tasks/tasks.service";
import { prismaMock, resetPrismaMocks } from "../../helpers/prisma-mock";
import { AppError } from "../../../src/utils/AppError";

const service = new TasksService(prismaMock as any);

const baseTask = {
  id: "t1",
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
    prismaMock.task.create.mockResolvedValueOnce(baseTask);
    prismaMock.notification.create.mockResolvedValueOnce({});

    const result = await service.createTask("u1", {
      title: "Fix bug",
      description: "Details",
      assigneeId: "u2",
    } as any);

    expect(result.id).toBe("t1");
    expect(prismaMock.notification.create).toHaveBeenCalledOnce();
  });

  it("does NOT create notification when no assignee", async () => {
    prismaMock.task.create.mockResolvedValueOnce({ ...baseTask, assigneeId: null });
    await service.createTask("u1", { title: "No assignee" } as any);
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });
});

describe("TasksService.getTasks", () => {
  it("returns list of tasks", async () => {
    prismaMock.task.findMany.mockResolvedValueOnce([baseTask]);
    const result = await service.getTasks({});
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Fix bug");
  });

  it("passes status filter to Prisma", async () => {
    prismaMock.task.findMany.mockResolvedValueOnce([]);
    await service.getTasks({ status: "DONE" as any });
    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "DONE" } })
    );
  });
});

describe("TasksService.getTaskById", () => {
  it("throws 404 if task not found", async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce(null);
    await expect(service.getTaskById("nonexistent")).rejects.toThrow(AppError);
  });
});

describe("TasksService.updateTask", () => {
  it("updates task and notifies new assignee", async () => {
    // first call is getTaskById inside updateTask
    prismaMock.task.findUnique.mockResolvedValueOnce(baseTask);
    prismaMock.task.update.mockResolvedValueOnce({ ...baseTask, assigneeId: "u3" });
    prismaMock.notification.create.mockResolvedValueOnce({});

    await service.updateTask("u1", "t1", { assigneeId: "u3" } as any);
    expect(prismaMock.notification.create).toHaveBeenCalledOnce();
  });
});

describe("TasksService.deleteTask", () => {
  it("deletes task after confirming existence", async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce(baseTask);
    prismaMock.task.delete.mockResolvedValueOnce(baseTask);
    await service.deleteTask("t1");
    expect(prismaMock.task.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });
});
