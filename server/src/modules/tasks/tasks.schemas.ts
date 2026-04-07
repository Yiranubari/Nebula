import { z } from "zod";
import { TaskStatus, Priority } from "@prisma/client";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().optional().nullable(),
  estimatedHours: z.number().min(0).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  labels: z.array(z.string()).optional(),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;

export const getTasksQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().optional(),
});
export type GetTasksQueryDto = z.infer<typeof getTasksQuerySchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
