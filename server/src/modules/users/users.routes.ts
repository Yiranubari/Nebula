import { Router } from "express";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate.middleware";
import { updateProfileSchema } from "./users.schemas";
import { protect } from "../auth/auth.middleware";

const router = Router();

const usersService = new UsersService(prisma);
const usersController = new UsersController(usersService);

// Require authentication for all user routes
router.use(protect);

router.get("/me", asyncHandler(usersController.getMe));
router.patch(
  "/me",
  validate(updateProfileSchema, "body"),
  asyncHandler(usersController.updateMe)
);

router.get("/", asyncHandler(usersController.getAllUsers));
router.get("/:id", asyncHandler(usersController.getUser));
router.delete("/:id", asyncHandler(usersController.deleteUser));

export default router;
