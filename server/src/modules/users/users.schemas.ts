import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").optional(),
  avatar: z.string().url("Invalid avatar URL").optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
