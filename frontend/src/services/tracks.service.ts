import { api } from "./api";
import type { Track, Message } from "@nebula/shared";

export interface CreateTrackPayload {
  name: string;
}

export interface UpdateTrackPayload {
  name?: string;
  addMemberIds?: string[];
  removeMemberIds?: string[];
}

// The server returns tracks with members as TrackMember[] (with nested user).
// We normalise to Track (with members as string[]) for the frontend store.
function normalise(raw: any): Track {
  const memberIds: string[] = Array.isArray(raw.members)
    ? raw.members.map((m: any) => (typeof m === "string" ? m : m.userId ?? m.user?.id ?? m))
    : [];
  return {
    id: raw.id,
    name: raw.name,
    createdAt: raw.createdAt,
    members: memberIds,
  };
}

export const tracksService = {
  list: async (): Promise<Track[]> => {
    const { data } = await api.get("/tracks");
    const raw = data.tracks ?? data;
    return Array.isArray(raw) ? raw.map(normalise) : [];
  },

  getById: async (id: string): Promise<Track> => {
    const { data } = await api.get(`/tracks/${id}`);
    return normalise(data.track ?? data);
  },

  create: async (payload: CreateTrackPayload): Promise<Track> => {
    const { data } = await api.post("/tracks", payload);
    return normalise(data.track ?? data);
  },

  addMember: async (trackId: string, userId: string): Promise<void> => {
    await api.post(`/tracks/${trackId}/members`, { userId });
  },

  removeMember: async (trackId: string, userId: string): Promise<void> => {
    await api.delete(`/tracks/${trackId}/members/${userId}`);
  },

  rename: async (trackId: string, name: string): Promise<Track> => {
    const { data } = await api.patch(`/tracks/${trackId}`, { name });
    return normalise(data.track ?? data);
  },

  delete: async (trackId: string): Promise<void> => {
    await api.delete(`/tracks/${trackId}`);
  },

  getMessages: async (
    trackId: string,
    cursor?: string,
    limit = 50
  ): Promise<{ items: Message[]; nextCursor?: string }> => {
    const { data } = await api.get(`/messages/tracks/${trackId}`, {
      params: { cursor, limit },
    });
    return data;
  },
};
