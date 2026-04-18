import { api } from "./api";
import type { Task } from "@nebula/shared";

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  estimatedHours?: number;
  dueDate?: string | null;
  labels?: string[];
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assigneeId?: string;
}

export const tasksService = {
  list: async (filters?: TaskFilters): Promise<Task[]> => {
    const { data } = await api.get("/tasks", { params: filters });
    return data.tasks ?? data;
  },

  getById: async (id: string): Promise<Task> => {
    const { data } = await api.get(`/tasks/${id}`);
    return data.task ?? data;
  },

  create: async (payload: CreateTaskPayload): Promise<Task> => {
    const { data } = await api.post("/tasks", payload);
    return data.task ?? data;
  },

  update: async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
    const { data } = await api.patch(`/tasks/${id}`, payload);
    return data.task ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
};
