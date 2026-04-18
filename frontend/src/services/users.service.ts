import { api } from "./api";
import type { User } from "@nebula/shared";

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  avatar?: string;
}

export const usersService = {
  list: async (): Promise<User[]> => {
    const { data } = await api.get("/users");
    return data.users ?? data;
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await api.get(`/users/${id}`);
    return data.user ?? data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get("/users/me");
    return data.user ?? data;
  },

  updateMe: async (payload: UpdateProfilePayload): Promise<User> => {
    const { data } = await api.patch("/users/me", payload);
    return data.user ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
