import { api } from "./api";
import type { Message } from "@nebula/shared";

export interface SendMessagePayload {
  trackId: string;
  content: string;
  parentId?: string;
  attachments?: { name: string; size: number; type: string; url: string }[];
}

export interface EditMessagePayload {
  content: string;
}

export const messagesService = {
  send: async (payload: SendMessagePayload): Promise<Message> => {
    const { data } = await api.post(`/messages/tracks/${payload.trackId}`, {
      content: payload.content,
      parentId: payload.parentId,
      attachments: payload.attachments,
    });
    return data.message ?? data;
  },

  edit: async (messageId: string, payload: EditMessagePayload): Promise<Message> => {
    const { data } = await api.patch(`/messages/${messageId}`, payload);
    return data.message ?? data;
  },

  delete: async (messageId: string): Promise<void> => {
    await api.delete(`/messages/${messageId}`);
  },

  pin: async (messageId: string, pinned: boolean): Promise<Message> => {
    const { data } = await api.patch(`/messages/${messageId}/pin`, { pinned });
    return data.message ?? data;
  },

  react: async (messageId: string, emoji: string): Promise<Message> => {
    const { data } = await api.patch(`/messages/${messageId}/react`, { emoji });
    return data.message ?? data;
  },

  markRead: async (messageId: string): Promise<void> => {
    await api.patch(`/messages/${messageId}/read`);
  },
};
