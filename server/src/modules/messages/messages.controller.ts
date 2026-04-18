import { Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { MessagesService } from "./messages.service";

export class MessagesController extends BaseController {
  constructor(private readonly messagesService: MessagesService) {
    super();
  }

  sendMessage = async (req: Request, res: Response) => {
    const trackId = req.params.trackId as string;
    const message = await this.messagesService.sendMessage(
      req.user!.id,
      trackId,
      req.body
    );
    this.created(res, message);
  };

  getMessages = async (req: Request, res: Response) => {
    const trackId = req.params.trackId as string;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 50;
    const cursor = req.query.cursor as string | undefined;

    const result = await this.messagesService.getMessages(
      req.user!.id,
      trackId,
      limit,
      cursor
    );
    this.ok(res, result);
  };

  editMessage = async (req: Request, res: Response) => {
    const message = await this.messagesService.editMessage(
      req.user!.id,
      req.params.messageId as string,
      req.body
    );
    this.ok(res, message);
  };

  deleteMessage = async (req: Request, res: Response) => {
    await this.messagesService.deleteMessage(
      req.user!.id,
      req.params.messageId as string
    );
    this.noContent(res);
  };

  pinMessage = async (req: Request, res: Response) => {
    const message = await this.messagesService.setPinned(
      req.user!.id,
      req.user!.role,
      req.params.messageId as string,
      req.body.pinned
    );
    this.ok(res, message);
  };

  reactMessage = async (req: Request, res: Response) => {
    const message = await this.messagesService.toggleReaction(
      req.user!.id,
      req.params.messageId as string,
      req.body.emoji
    );
    this.ok(res, message);
  };

  markRead = async (req: Request, res: Response) => {
    const message = await this.messagesService.markRead(
      req.user!.id,
      req.params.messageId as string
    );
    this.ok(res, message);
  };
}
