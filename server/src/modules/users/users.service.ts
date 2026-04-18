import { BaseService } from "../../core/BaseService";
import { UpdateProfileDto } from "./users.schemas";
import { AppError } from "../../utils/AppError";
import { audit } from "../../utils/audit";

type Role = "ADMIN" | "MEMBER";

export class UsersService extends BaseService {
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) throw new AppError(404, "User not found");
    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    return user;
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
      orderBy: { name: "asc" },
    });
  }

  async getUserById(targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    if (!user) throw new AppError(404, "User not found");
    return user;
  }

  async deleteUser(actorId: string, actorRole: Role, targetUserId: string) {
    const isSelf = actorId === targetUserId;
    const isAdmin = actorRole === "ADMIN";
    if (!isSelf && !isAdmin) {
      throw new AppError(403, "Only admins can delete other users");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!target) throw new AppError(404, "User not found");

    // Prisma schema cascades on Message/DM/TrackMember/RefreshToken.
    // Tasks are SET NULL on the assignee.
    await this.prisma.user.delete({ where: { id: targetUserId } });
    audit("user.delete", { actorId, targetId: targetUserId });
  }
}
