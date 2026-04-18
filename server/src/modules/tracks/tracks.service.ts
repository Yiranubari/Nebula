import { BaseService } from "../../core/BaseService";
import { CreateTrackDto, UpdateTrackDto } from "./tracks.schemas";
import { AppError } from "../../utils/AppError";
import { audit } from "../../utils/audit";

type Role = "ADMIN" | "MEMBER";

export class TracksService extends BaseService {
  async createTrack(userId: string, data: CreateTrackDto) {
    // Bootstrap rule: if the workspace has no default track yet, the first
    // track created becomes the default so invited users have somewhere to
    // land automatically.
    const existingDefault = await this.prisma.track.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });
    const shouldBeDefault = !existingDefault;

    return this.prisma.track.create({
      data: {
        name: data.name,
        isDefault: shouldBeDefault,
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

  async getTrackById(trackId: string, userId: string, role: Role = "MEMBER") {
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

    // Admins can see every track even if they aren't on the member list.
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
    targetUserId: string
  ) {
    // Ensure the requester can see the track (admin OR member).
    await this.getTrackById(trackId, actorUserId, actorRole);

    // Idempotent: if the user is already a member, return the existing row
    // rather than surfacing a Prisma unique-constraint error. Admins often
    // double-click the checkbox or race two concurrent toggles.
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
    targetUserId: string
  ) {
    await this.getTrackById(trackId, actorUserId, actorRole);

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
    // Must be a member to see it, admin to edit
    await this.getTrackById(trackId, userId);
    if (role !== "ADMIN") {
      throw new AppError(403, "Only admins can update a track");
    }

    // Flipping a track to default demotes any existing defaults so we only
    // ever have one "#general" equivalent at a time.
    if (data.isDefault === true) {
      await this.prisma.track.updateMany({
        where: { isDefault: true, NOT: { id: trackId } },
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
      audit("track.rename", { actorId: userId, targetId: trackId, name: data.name });
    }
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
