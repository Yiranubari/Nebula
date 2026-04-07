import { BaseService } from "../../core/BaseService";
import { CreateTaskDto, UpdateTaskDto } from "./tasks.schemas";
import { AppError } from "../../utils/AppError";
import { TaskStatus, Priority } from "@prisma/client";

export class TasksService extends BaseService {
  async createTask(data: CreateTaskDto) {
    return this.prisma.task.create({
      data,
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });
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

  async updateTask(taskId: string, data: UpdateTaskDto) {
    // Check if task exists first
    await this.getTaskById(taskId);

    return this.prisma.task.update({
      where: { id: taskId },
      data,
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async deleteTask(taskId: string) {
    await this.getTaskById(taskId);

    await this.prisma.task.delete({
      where: { id: taskId },
    });
  }
}
