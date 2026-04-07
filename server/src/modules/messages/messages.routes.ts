import { Router } from "express";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate.middleware";
import { protect } from "../auth/auth.middleware";
import {
  sendMessageSchema,
  editMessageSchema,
  getMessagesQuerySchema,
} from "./messages.schemas";

const router = Router();

const messagesService = new MessagesService(prisma);
const messagesController = new MessagesController(messagesService);

router.use(protect);

router.post(
  "/tracks/:trackId",
  validate(sendMessageSchema, "body"),
  asyncHandler(messagesController.sendMessage)
);

router.get(
  "/tracks/:trackId",
  validate(getMessagesQuerySchema, "query"),
  asyncHandler(messagesController.getMessages)
);

router.patch(
  "/:messageId",
  validate(editMessageSchema, "body"),
  asyncHandler(messagesController.editMessage)
);

router.delete("/:messageId", asyncHandler(messagesController.deleteMessage));

export default router;
