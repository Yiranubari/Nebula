import { BaseService } from "../../core/BaseService";
import { CreateTrackDto, UpdateTrackDto } from "./tracks.schemas";
import { AppError } from "../../utils/AppError";
import { audit } from "../../utils/audit";

type Role = "ADMIN" | "MEMBER";

export class TracksService extends BaseService {
  async createTrack(userId: string, data: CreateTrackDto) {
    return this.prisma.track.create({
      data: {
        name: data.name,
        members: {
          create: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });
  }

  async getTracksForUser(userId: string) {
    return this.prisma.track.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTrackById(trackId: string, userId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    if (!track) throw new AppError(404, "Track not found");

    const isMember = track.members.some((m) => m.userId === userId);
    if (!isMember) throw new AppError(403, "Not a member of this track");

    return track;
  }

  async addMember(trackId: string, adminUserId: string, targetUserId: string) {
    // Ensure the requester is a member
    await this.getTrackById(trackId, adminUserId);

    return this.prisma.trackMember.create({
      data: {
        trackId,
        userId: targetUserId,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async removeMember(
    trackId: string,
    adminUserId: string,
    targetUserId: string
  ) {
    // Ensure the requester is a member
    await this.getTrackById(trackId, adminUserId);

    await this.prisma.trackMember.delete({
      where: {
        trackId_userId: {
          trackId,
          userId: targetUserId,
        },
      },
    });
  }

  async renameTrack(
    trackId: string,
    userId: string,
    role: Role,
    data: UpdateTrackDto
  ) {
    // Must be a member to see it, admin to rename
    await this.getTrackById(trackId, userId);
    if (role !== "ADMIN") {
      throw new AppError(403, "Only admins can rename a track");
    }

    const track = await this.prisma.track.update({
      where: { id: trackId },
      data: { name: data.name },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });
    audit("track.rename", { actorId: userId, targetId: trackId, name: data.name });
    return track;
  }

  async deleteTrack(trackId: string, userId: string, role: Role) {
    await this.getTrackById(trackId, userId);
    if (role !== "ADMIN") {
      throw new AppError(403, "Only admins can delete a track");
    }

    // Cascade deletes TrackMember + Message rows via schema onDelete: Cascade
    await this.prisma.track.delete({
      where: { id: trackId },
    });
    audit("track.delete", { actorId: userId, targetId: trackId });
  }
}
