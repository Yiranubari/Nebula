import { Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { NotificationsService } from "./notifications.service";
import { requireWorkspace } from "../../utils/requireWorkspace";

export class NotificationsController extends BaseController {
  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  getNotifications = async (req: Request, res: Response) => {
    const notifications = await this.notificationsService.getMyNotifications(
      req.user!.id,
      requireWorkspace(req)
    );
    this.ok(res, notifications);
  };

  updateNotification = async (req: Request, res: Response) => {
    const notification = await this.notificationsService.updateNotification(
      req.user!.id,
      requireWorkspace(req),
      req.params.id as string,
      req.body
    );
    this.ok(res, notification);
  };

  deleteNotification = async (req: Request, res: Response) => {
    await this.notificationsService.deleteNotification(
      req.user!.id,
      requireWorkspace(req),
      req.params.id as string
    );
    this.noContent(res);
  };

  markAllRead = async (req: Request, res: Response) => {
    const result = await this.notificationsService.markAllRead(
      req.user!.id,
      requireWorkspace(req)
    );
    this.ok(res, result);
  };
}
