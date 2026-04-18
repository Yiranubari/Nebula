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
  pinMessageSchema,
  reactMessageSchema,
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

router.patch(
  "/:messageId/pin",
  validate(pinMessageSchema, "body"),
  asyncHandler(messagesController.pinMessage)
);

router.patch(
  "/:messageId/react",
  validate(reactMessageSchema, "body"),
  asyncHandler(messagesController.reactMessage)
);

router.patch("/:messageId/read", asyncHandler(messagesController.markRead));

export default router;
