import { Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { TracksService } from "./tracks.service";

export class TracksController extends BaseController {
  constructor(private readonly tracksService: TracksService) {
    super();
  }

  createTrack = async (req: Request, res: Response) => {
    const track = await this.tracksService.createTrack(req.user!.id, req.body);
    this.created(res, track);
  };

  getTracks = async (req: Request, res: Response) => {
    const tracks = await this.tracksService.getTracksForUser(req.user!.id);
    this.ok(res, tracks);
  };

  getTrack = async (req: Request, res: Response) => {
    const track = await this.tracksService.getTrackById(
      req.params.id as string,
      req.user!.id
    );
    this.ok(res, track);
  };

  addMember = async (req: Request, res: Response) => {
    const member = await this.tracksService.addMember(
      req.params.id as string,
      req.user!.id,
      req.body.userId
    );
    this.created(res, member);
  };

  removeMember = async (req: Request, res: Response) => {
    await this.tracksService.removeMember(
      req.params.id as string,
      req.user!.id,
      req.params.userId as string
    );
    this.noContent(res);
  };

  renameTrack = async (req: Request, res: Response) => {
    const track = await this.tracksService.renameTrack(
      req.params.id as string,
      req.user!.id,
      req.user!.role,
      req.body
    );
    this.ok(res, track);
  };

  deleteTrack = async (req: Request, res: Response) => {
    await this.tracksService.deleteTrack(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    );
    this.noContent(res);
  };
}
