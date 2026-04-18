import { Router } from "express";
import { TracksController } from "./tracks.controller";
import { TracksService } from "./tracks.service";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate.middleware";
import {
  createTrackSchema,
  addMemberSchema,
  updateTrackSchema,
} from "./tracks.schemas";
import { protect } from "../auth/auth.middleware";

const router = Router();

const tracksService = new TracksService(prisma);
const tracksController = new TracksController(tracksService);

router.use(protect);

router.post(
  "/",
  validate(createTrackSchema, "body"),
  asyncHandler(tracksController.createTrack)
);

router.get("/", asyncHandler(tracksController.getTracks));

router.get("/:id", asyncHandler(tracksController.getTrack));

router.post(
  "/:id/members",
  validate(addMemberSchema, "body"),
  asyncHandler(tracksController.addMember)
);

router.delete(
  "/:id/members/:userId",
  asyncHandler(tracksController.removeMember)
);

router.patch(
  "/:id",
  validate(updateTrackSchema, "body"),
  asyncHandler(tracksController.renameTrack)
);

router.delete("/:id", asyncHandler(tracksController.deleteTrack));

export default router;
