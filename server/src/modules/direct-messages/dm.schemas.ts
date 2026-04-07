import { z } from "zod";

export const sendDmSchema = z.object({
  content: z.string().min(1, "Message content is required"),
});

export type SendDmDto = z.infer<typeof sendDmSchema>;

export const getDmsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});
