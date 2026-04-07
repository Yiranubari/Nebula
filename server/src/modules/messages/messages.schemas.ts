import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
  parentId: z.string().optional().nullable(),
  attachments: z.any().optional().nullable(),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const editMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
});

export type EditMessageDto = z.infer<typeof editMessageSchema>;

export const getMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});
