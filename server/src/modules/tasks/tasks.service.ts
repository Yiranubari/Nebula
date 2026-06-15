import { BaseService } from "../../core/BaseService";
import { CreateTaskDto, UpdateTaskDto } from "./tasks.schemas";
import { AppError } from "../../utils/AppError";
import { audit } from "../../utils/audit";
import { TaskStatus, Priority } from "@prisma/client";

type Role = "ADMIN" | "MEMBER";

const ASSIGNEE_EDITABLE_FIELDS = new Set<keyof UpdateTaskDto>([
  "status",
  "description",
  "labels",
  "estimatedHours",
]);

export class TasksService extends BaseService {
  async createTask(userId: string, workspaceId: string, data: CreateTaskDto) {
    if (data.assigneeId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { workspaceId: true },
      });
      if (!assignee || assignee.workspaceId !== workspaceId) {
        throw new AppError(404, "Assignee not found in this workspace");
      }
    }

    const task = await this.prisma.task.create({
      data: { ...data, workspaceId },
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });

    if (task.assigneeId && task.assigneeId !== userId) {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          type: "ASSIGNED",
          taskId: task.id,
          requesterId: userId,
          recipientId: task.assigneeId,
        },
      });
    }

    return task;
  }

  async getTasks(
    workspaceId: string,
    filters: {
      status?: TaskStatus;
      priority?: Priority;
      assigneeId?: string;
    }
  ) {
    const where: any = { workspaceId };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;

    return this.prisma.task.findMany({
      where,
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTaskById(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });

    if (!task) throw new AppError(404, "Task not found");
    return task;
  }

  async updateTask(
    userId: string,
    role: Role,
    workspaceId: string,
    taskId: string,
    data: UpdateTaskDto
  ) {
    const existingTask = await this.getTaskById(workspaceId, taskId);

    const isAdmin = role === "ADMIN";
    const isAssignee = existingTask.assigneeId === userId;
    if (!isAdmin && !isAssignee) {
      throw new AppError(
        403,
        "Only the assignee or an admin can update this task"
      );
    }

    if (data.assigneeId && data.assigneeId !== existingTask.assigneeId) {
      const next = await this.prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { workspaceId: true },
      });
      if (!next || next.workspaceId !== workspaceId) {
        throw new AppError(404, "Assignee not found in this workspace");
      }
    }

    let patch: UpdateTaskDto = data;
    if (!isAdmin) {
      const filtered: UpdateTaskDto = {};
      for (const key of Object.keys(data) as (keyof UpdateTaskDto)[]) {
        if (ASSIGNEE_EDITABLE_FIELDS.has(key)) {
          (filtered as any)[key] = (data as any)[key];
        }
      }
      patch = filtered;
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: patch,
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });

    if (
      task.assigneeId &&
      task.assigneeId !== existingTask.assigneeId &&
      task.assigneeId !== userId
    ) {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          type: "ASSIGNED",
          taskId: task.id,
          requesterId: userId,
          recipientId: task.assigneeId,
        },
      });
    }

    return task;
  }

  async deleteTask(
    userId: string,
    role: Role,
    workspaceId: string,
    taskId: string
  ) {
    await this.getTaskById(workspaceId, taskId);
    if (role !== "ADMIN") {
      throw new AppError(403, "Only admins can delete a task");
    }
    await this.prisma.task.delete({ where: { id: taskId } });
    audit("task.delete", { actorId: userId, targetId: taskId, workspaceId });
  }
}
