import { Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { UsersService } from "./users.service";
import { requireWorkspace } from "../../utils/requireWorkspace";

export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  getMe = async (req: Request, res: Response) => {
    const user = await this.usersService.getProfile(req.user!.id);
    this.ok(res, user);
  };

  updateMe = async (req: Request, res: Response) => {
    const user = await this.usersService.updateProfile(req.user!.id, req.body);
    this.ok(res, user);
  };

  getAllUsers = async (req: Request, res: Response) => {
    const users = await this.usersService.getAllUsers(requireWorkspace(req));
    this.ok(res, users);
  };

  getUser = async (req: Request, res: Response) => {
    const user = await this.usersService.getUserById(
      requireWorkspace(req),
      req.params.id as string
    );
    this.ok(res, user);
  };

  deleteUser = async (req: Request, res: Response) => {
    await this.usersService.deleteUser(
      req.user!.id,
      req.user!.role,
      requireWorkspace(req),
      req.params.id as string
    );
    this.noContent(res);
  };

  updateRole = async (req: Request, res: Response) => {
    const user = await this.usersService.updateRole(
      req.user!.id,
      req.user!.role,
      requireWorkspace(req),
      req.params.id as string,
      req.body.role
    );
    this.ok(res, user);
  };
}
