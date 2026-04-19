import { Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { DmService } from "./dm.service";
import { requireWorkspace } from "../../utils/requireWorkspace";

export class DmController extends BaseController {
  constructor(private readonly dmService: DmService) {
    super();
  }

  sendDm = async (req: Request, res: Response) => {
    const toUserId = req.params.userId as string;
    const message = await this.dmService.sendDm(
      req.user!.id,
      requireWorkspace(req),
      toUserId,
      req.body
    );
    this.created(res, message);
  };

  getConversation = async (req: Request, res: Response) => {
    const targetUserId = req.params.userId as string;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 50;
    const cursor = req.query.cursor as string | undefined;

    const result = await this.dmService.getConversation(
      req.user!.id,
      requireWorkspace(req),
      targetUserId,
      limit,
      cursor
    );
    this.ok(res, result);
  };

  deleteDm = async (req: Request, res: Response) => {
    await this.dmService.deleteOwnDm(
      req.user!.id,
      requireWorkspace(req),
      req.params.messageId as string
    );
    this.noContent(res);
  };
}
