import { z } from "zod";
import { NotifStatus } from "@prisma/client";

export const updateNotificationSchema = z.object({
  status: z.nativeEnum(NotifStatus).optional(),
  read: z.boolean().optional(),
});

export type UpdateNotificationDto = z.infer<typeof updateNotificationSchema>;
