import { z } from "zod";

export const createTrackSchema = z.object({
  name: z.string().min(1, "Track name is required"),
});

export type CreateTrackDto = z.infer<typeof createTrackSchema>;

export const addMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export type AddMemberDto = z.infer<typeof addMemberSchema>;
