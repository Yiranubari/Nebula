import { BaseService } from "../../core/BaseService";
import { CreateTaskDto, UpdateTaskDto } from "./tasks.schemas";
import { AppError } from "../../utils/AppError";
import { TaskStatus, Priority } from "@prisma/client";

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

  async updateTask(userId: string, taskId: string, data: UpdateTaskDto) {
    // Check if task exists first
    const existingTask = await this.getTaskById(taskId);

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data,
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

  async deleteTask(taskId: string) {
    await this.getTaskById(taskId);

    await this.prisma.task.delete({
      where: { id: taskId },
    });
  }
}
