import type { Response } from "express";

export abstract class BaseController {
  protected send<T>(res: Response, statusCode: number, data: T): void {
    res.status(statusCode).json({ status: "success", data });
  }

  protected ok<T>(res: Response, data: T): void {
    this.send(res, 200, data);
  }

  protected created<T>(res: Response, data: T): void {
    this.send(res, 201, data);
  }

  protected noContent(res: Response): void {
    res.status(204).send();
  }
}
