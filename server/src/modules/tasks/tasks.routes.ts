import { Router } from "express";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate.middleware";
import {
  createTaskSchema,
  updateTaskSchema,
  getTasksQuerySchema,
} from "./tasks.schemas";
import { protect } from "../auth/auth.middleware";

const router = Router();

const tasksService = new TasksService(prisma);
const tasksController = new TasksController(tasksService);

router.use(protect);

router.post(
  "/",
  validate(createTaskSchema, "body"),
  asyncHandler(tasksController.createTask)
);

router.get(
  "/",
  validate(getTasksQuerySchema, "query"),
  asyncHandler(tasksController.getTasks)
);

router.get("/:id", asyncHandler(tasksController.getTask));

router.patch(
  "/:id",
  validate(updateTaskSchema, "body"),
  asyncHandler(tasksController.updateTask)
);

router.delete("/:id", asyncHandler(tasksController.deleteTask));

export default router;
