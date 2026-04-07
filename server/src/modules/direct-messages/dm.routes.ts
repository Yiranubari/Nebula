import { Router } from "express";
import { DmController } from "./dm.controller";
import { DmService } from "./dm.service";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate.middleware";
import { protect } from "../auth/auth.middleware";
import { sendDmSchema, getDmsQuerySchema } from "./dm.schemas";

const router = Router();

const dmService = new DmService(prisma);
const dmController = new DmController(dmService);

router.use(protect);

router.post(
  "/:userId",
  validate(sendDmSchema, "body"),
  asyncHandler(dmController.sendDm)
);

router.get(
  "/:userId",
  validate(getDmsQuerySchema, "query"),
  asyncHandler(dmController.getConversation)
);

router.delete("/:messageId", asyncHandler(dmController.deleteDm));

export default router;
