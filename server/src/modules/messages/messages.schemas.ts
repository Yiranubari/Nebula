import { z } from "zod";

export const attachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  size: z.number().int().nonnegative().optional(),
  type: z.string().optional(),
  url: z.string().url(),
});
export type AttachmentDto = z.infer<typeof attachmentSchema>;

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
  parentId: z.string().optional().nullable(),
  attachments: z.array(attachmentSchema).max(10).optional().nullable(),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const editMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
});

export type EditMessageDto = z.infer<typeof editMessageSchema>;

export const pinMessageSchema = z.object({
  pinned: z.boolean(),
});
export type PinMessageDto = z.infer<typeof pinMessageSchema>;

export const reactMessageSchema = z.object({
  emoji: z
    .string()
    .min(1, "Emoji is required")
    .max(16, "Emoji string is too long"),
});
export type ReactMessageDto = z.infer<typeof reactMessageSchema>;

export const getMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});
