import { Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { TasksService } from "./tasks.service";
import { TaskStatus, Priority } from "@prisma/client";

export class TasksController extends BaseController {
  constructor(private readonly tasksService: TasksService) {
    super();
  }

  createTask = async (req: Request, res: Response) => {
    const task = await this.tasksService.createTask(req.body);
    this.created(res, task);
  };

  getTasks = async (req: Request, res: Response) => {
    const tasks = await this.tasksService.getTasks({
      status: req.query.status as TaskStatus,
      priority: req.query.priority as Priority,
      assigneeId: req.query.assigneeId as string,
    });
    this.ok(res, tasks);
  };

  getTask = async (req: Request, res: Response) => {
    const task = await this.tasksService.getTaskById(req.params.id as string);
    this.ok(res, task);
  };

  updateTask = async (req: Request, res: Response) => {
    const task = await this.tasksService.updateTask(
      req.params.id as string,
      req.body
    );
    this.ok(res, task);
  };

  deleteTask = async (req: Request, res: Response) => {
    await this.tasksService.deleteTask(req.params.id as string);
    this.noContent(res);
  };
}
