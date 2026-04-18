import { BaseService } from "../../core/BaseService";
import { CreateTaskDto, UpdateTaskDto } from "./tasks.schemas";
import { AppError } from "../../utils/AppError";
import { audit } from "../../utils/audit";
import { TaskStatus, Priority } from "@prisma/client";

type Role = "ADMIN" | "MEMBER";

// Fields an assignee can edit on their own task. Admins can edit everything.
const ASSIGNEE_EDITABLE_FIELDS = new Set<keyof UpdateTaskDto>([
  "status",
  "description",
  "labels",
  "estimatedHours",
]);

export class TasksService extends BaseService {
  async createTask(userId: string, data: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data,
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });

    if (task.assigneeId && task.assigneeId !== userId) {
      await this.prisma.notification.create({
        data: {
          type: "ASSIGNED",
          taskId: task.id,
          requesterId: userId,
          recipientId: task.assigneeId,
        },
      });
    }

    return task;
  }

  async getTasks(filters: {
    status?: TaskStatus;
    priority?: Priority;
    assigneeId?: string;
  }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;

    return this.prisma.task.findMany({
      where,
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTaskById(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });

    if (!task) throw new AppError(404, "Task not found");
    return task;
  }

  async updateTask(
    userId: string,
    role: Role,
    taskId: string,
    data: UpdateTaskDto
  ) {
    const existingTask = await this.getTaskById(taskId);

    const isAdmin = role === "ADMIN";
    const isAssignee = existingTask.assigneeId === userId;
    if (!isAdmin && !isAssignee) {
      throw new AppError(
        403,
        "Only the assignee or an admin can update this task"
      );
    }

    // Non-admins can only modify a whitelist of fields
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
          type: "ASSIGNED",
          taskId: task.id,
          requesterId: userId,
          recipientId: task.assigneeId,
        },
      });
    }

    return task;
  }

  async deleteTask(userId: string, role: Role, taskId: string) {
    await this.getTaskById(taskId);
    if (role !== "ADMIN") {
      throw new AppError(403, "Only admins can delete a task");
    }
    await this.prisma.task.delete({ where: { id: taskId } });
    audit("task.delete", { actorId: userId, targetId: taskId });
  }
}
