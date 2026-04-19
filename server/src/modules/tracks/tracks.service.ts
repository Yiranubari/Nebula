import { BaseService } from "../../core/BaseService";
import { CreateTrackDto, UpdateTrackDto } from "./tracks.schemas";
import { AppError } from "../../utils/AppError";
import { audit } from "../../utils/audit";

type Role = "ADMIN" | "MEMBER";

export class TracksService extends BaseService {
  async createTrack(userId: string, workspaceId: string, data: CreateTrackDto) {
    // Bootstrap rule within this workspace: if there's no default track yet,
    // the first track becomes the default so invitees have somewhere to land.
    const existingDefault = await this.prisma.track.findFirst({
      where: { isDefault: true, workspaceId },
      select: { id: true },
    });
    const shouldBeDefault = !existingDefault;

    return this.prisma.track.create({
      data: {
        name: data.name,
        isDefault: shouldBeDefault,
        workspaceId,
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

  async getTracksForUser(userId: string, workspaceId: string) {
    return this.prisma.track.findMany({
      where: {
        workspaceId,
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

  async getTrackById(
    trackId: string,
    userId: string,
    workspaceId: string,
    role: Role = "MEMBER"
  ) {
    const track = await this.prisma.track.findFirst({
      where: { id: trackId, workspaceId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    if (!track) throw new AppError(404, "Track not found");

    // Admins see every track in their workspace even if they aren't members.
    const isMember = track.members.some((m) => m.userId === userId);
    if (role !== "ADMIN" && !isMember) {
      throw new AppError(403, "Not a member of this track");
    }

    return track;
  }

  async addMember(
    trackId: string,
    actorUserId: string,
    actorRole: Role,
    workspaceId: string,
    targetUserId: string
  ) {
    await this.getTrackById(trackId, actorUserId, workspaceId, actorRole);

    // Verify target is in the same workspace — you cannot pull a user from
    // another tenant into your track.
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { workspaceId: true },
    });
    if (!target || target.workspaceId !== workspaceId) {
      throw new AppError(404, "User not found in this workspace");
    }

    return this.prisma.trackMember.upsert({
      where: { trackId_userId: { trackId, userId: targetUserId } },
      create: { trackId, userId: targetUserId },
      update: {},
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async removeMember(
    trackId: string,
    actorUserId: string,
    actorRole: Role,
    workspaceId: string,
    targetUserId: string
  ) {
    await this.getTrackById(trackId, actorUserId, workspaceId, actorRole);

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
    workspaceId: string,
    data: UpdateTrackDto
  ) {
    await this.getTrackById(trackId, userId, workspaceId);
    if (role !== "ADMIN") {
      throw new AppError(403, "Only admins can update a track");
    }

    // Flipping this track to default demotes any existing defaults in the
    // same workspace so there's only ever one "#general" per workspace.
    if (data.isDefault === true) {
      await this.prisma.track.updateMany({
        where: { isDefault: true, workspaceId, NOT: { id: trackId } },
        data: { isDefault: false },
      });
    }

    const patch: { name?: string; isDefault?: boolean } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.isDefault !== undefined) patch.isDefault = data.isDefault;

    const track = await this.prisma.track.update({
      where: { id: trackId },
      data: patch,
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });
    if (data.name !== undefined) {
      audit("track.rename", {
        actorId: userId,
        targetId: trackId,
        name: data.name,
        workspaceId,
      });
    }
    return track;
  }

  async deleteTrack(
    trackId: string,
    userId: string,
    role: Role,
    workspaceId: string
  ) {
    await this.getTrackById(trackId, userId, workspaceId);
    if (role !== "ADMIN") {
      throw new AppError(403, "Only admins can delete a track");
    }

    await this.prisma.track.delete({
      where: { id: trackId },
    });
    audit("track.delete", { actorId: userId, targetId: trackId, workspaceId });
  }
}
