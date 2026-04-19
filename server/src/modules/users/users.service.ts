import { BaseService } from "../../core/BaseService";
import { UpdateProfileDto } from "./users.schemas";
import { AppError } from "../../utils/AppError";
import { audit } from "../../utils/audit";

type Role = "ADMIN" | "MEMBER";

export class UsersService extends BaseService {
  /** Always includes workspaceId — the client needs it to display context. */
  private readonly publicSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    avatar: true,
    workspaceId: true,
    createdAt: true,
  } as const;

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...this.publicSelect,
        workspace: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
      },
    });

    if (!user) throw new AppError(404, "User not found");
    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: this.publicSelect,
    });

    return user;
  }

  async getAllUsers(workspaceId: string) {
    return this.prisma.user.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        workspaceId: true,
        isVerified: true,
        invitedById: true,
      },
      orderBy: { name: "asc" },
    });
  }

  async getUserById(workspaceId: string, targetUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        workspaceId: true,
      },
    });

    if (!user) throw new AppError(404, "User not found");
    return user;
  }

  async deleteUser(
    actorId: string,
    actorRole: Role,
    workspaceId: string,
    targetUserId: string
  ) {
    const isSelf = actorId === targetUserId;
    const isAdmin = actorRole === "ADMIN";
    if (!isSelf && !isAdmin) {
      throw new AppError(403, "Only admins can delete other users");
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, workspaceId },
      select: { id: true },
    });
    if (!target) throw new AppError(404, "User not found");

    await this.prisma.user.delete({ where: { id: targetUserId } });
    audit("user.delete", { actorId, targetId: targetUserId, workspaceId });
  }

  async updateRole(
    actorId: string,
    actorRole: Role,
    workspaceId: string,
    targetUserId: string,
    newRole: Role
  ) {
    if (actorRole !== "ADMIN") {
      throw new AppError(403, "Only admins can change roles");
    }
    if (actorId === targetUserId) {
      throw new AppError(
        400,
        "You can't change your own role. Ask another admin to do it."
      );
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, workspaceId },
      select: { id: true, role: true },
    });
    if (!target) throw new AppError(404, "User not found");

    // Never let a workspace end up with zero admins.
    if (target.role === "ADMIN" && newRole === "MEMBER") {
      const adminCount = await this.prisma.user.count({
        where: { workspaceId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        throw new AppError(
          400,
          "Cannot demote the last admin. Promote someone else first."
        );
      }
    }

    if (target.role === newRole) {
      return this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: this.publicSelect,
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: this.publicSelect,
    });

    audit("user.role_change", {
      actorId,
      targetId: targetUserId,
      newRole,
      workspaceId,
    });

    return updated;
  }
}
