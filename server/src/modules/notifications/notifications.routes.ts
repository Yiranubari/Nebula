import { Router } from "express";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate.middleware";
import { protect } from "../auth/auth.middleware";
import { updateNotificationSchema } from "./notifications.schemas";

const router = Router();

const service = new NotificationsService(prisma);
const controller = new NotificationsController(service);

router.use(protect);

router.get("/", asyncHandler(controller.getNotifications));

router.patch(
  "/:id",
  validate(updateNotificationSchema, "body"),
  asyncHandler(controller.updateNotification)
);

router.delete("/:id", asyncHandler(controller.deleteNotification));

export default router;
