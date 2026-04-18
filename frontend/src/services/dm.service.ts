import { api } from "./api";
import type { DirectMessage } from "@nebula/shared";

export interface SendDmPayload {
  toUserId: string;
  content: string;
  attachments?: { name: string; size: number; type: string; url: string }[];
}

export const dmService = {
  getHistory: async (
    withUserId: string,
    cursor?: string,
    limit = 50
  ): Promise<{ items: DirectMessage[]; nextCursor?: string }> => {
    const { data } = await api.get(`/dm/${withUserId}`, {
      params: { cursor, limit },
    });
    return data;
  },

  delete: async (messageId: string): Promise<void> => {
    await api.delete(`/dm/${messageId}`);
  },
};
