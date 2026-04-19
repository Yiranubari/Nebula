import { BaseService } from "../../core/BaseService";
import { SendMessageDto, EditMessageDto } from "./messages.schemas";
import { AppError } from "../../utils/AppError";

type Role = "ADMIN" | "MEMBER";

/**
 * Admins can read and write in every track in their workspace regardless of
 * explicit membership. Members must be on the track roster.
 */
const canAccessTrack = (role: Role, isMember: boolean) =>
  role === "ADMIN" || isMember;

export class MessagesService extends BaseService {
  private async isMember(trackId: string, userId: string) {
    const member = await this.prisma.trackMember.findUnique({
      where: { trackId_userId: { trackId, userId } },
    });
    return !!member;
  }

  /** Fetches a track, verifying it's in the caller's workspace. */
  private async getTrackInWorkspace(trackId: string, workspaceId: string) {
    const track = await this.prisma.track.findFirst({
      where: { id: trackId, workspaceId },
      select: { id: true },
    });
    if (!track) throw new AppError(404, "Track not found");
    return track;
  }

  async sendMessage(
    userId: string,
    role: Role,
    workspaceId: string,
    trackId: string,
    data: SendMessageDto
  ) {
    await this.getTrackInWorkspace(trackId, workspaceId);
    if (!canAccessTrack(role, await this.isMember(trackId, userId))) {
      throw new AppError(
        403,
        "You must be a member of the track to send messages"
      );
    }

    return this.prisma.message.create({
      data: {
        workspaceId,
        content: data.content,
        userId,
        trackId,
        parentId: data.parentId || null,
        ...(data.attachments ? { attachments: data.attachments } : {}),
        readBy: [userId],
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async getMessages(
    userId: string,
    role: Role,
    workspaceId: string,
    trackId: string,
    limit = 50,
    cursor?: string
  ) {
    await this.getTrackInWorkspace(trackId, workspaceId);
    if (!canAccessTrack(role, await this.isMember(trackId, userId))) {
      throw new AppError(
        403,
        "You must be a member of the track to view messages"
      );
    }

    const messages = await this.prisma.message.findMany({
      where: { workspaceId, trackId, parentId: null },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items: messages.reverse(),
      nextCursor,
    };
  }

  /** Lookup a message and verify it's in the caller's workspace. */
  private async getScopedMessage(messageId: string, workspaceId: string) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, workspaceId },
    });
    if (!message) throw new AppError(404, "Message not found");
    return message;
  }

  async editMessage(
    userId: string,
    workspaceId: string,
    messageId: string,
    data: EditMessageDto
  ) {
    const message = await this.getScopedMessage(messageId, workspaceId);
    if (message.userId !== userId)
      throw new AppError(403, "You can only edit your own messages");

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: data.content },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async deleteMessage(userId: string, workspaceId: string, messageId: string) {
    const message = await this.getScopedMessage(messageId, workspaceId);
    if (message.userId !== userId)
      throw new AppError(403, "You can only delete your own messages");

    await this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  private async assertTrackAccess(
    trackId: string,
    userId: string,
    role: Role
  ) {
    if (!canAccessTrack(role, await this.isMember(trackId, userId))) {
      throw new AppError(403, "You must be a member of the track");
    }
  }

  async setPinned(
    userId: string,
    role: Role,
    workspaceId: string,
    messageId: string,
    pinned: boolean
  ) {
    const message = await this.getScopedMessage(messageId, workspaceId);
    await this.assertTrackAccess(message.trackId, userId, role);
    if (role !== "ADMIN" && message.userId !== userId) {
      throw new AppError(403, "Only admins or the author can pin this message");
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { pinned },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async toggleReaction(
    userId: string,
    role: Role,
    workspaceId: string,
    messageId: string,
    emoji: string
  ) {
    const message = await this.getScopedMessage(messageId, workspaceId);
    await this.assertTrackAccess(message.trackId, userId, role);

    const reactions = (message.reactions as Record<string, string[]>) ?? {};
    const existing = reactions[emoji] ?? [];
    if (existing.includes(userId)) {
      reactions[emoji] = existing.filter((id) => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...existing, userId];
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { reactions },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async markRead(
    userId: string,
    role: Role,
    workspaceId: string,
    messageId: string
  ) {
    const message = await this.getScopedMessage(messageId, workspaceId);
    await this.assertTrackAccess(message.trackId, userId, role);

    if (message.readBy.includes(userId)) return message;

    return this.prisma.message.update({
      where: { id: messageId },
      data: { readBy: { push: userId } },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }
}
