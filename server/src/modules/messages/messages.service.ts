import { BaseService } from "../../core/BaseService";
import { SendMessageDto, EditMessageDto } from "./messages.schemas";
import { AppError } from "../../utils/AppError";

type Role = "ADMIN" | "MEMBER";

export class MessagesService extends BaseService {
  async sendMessage(userId: string, trackId: string, data: SendMessageDto) {
    // Check if user is in track
    const trackMember = await this.prisma.trackMember.findUnique({
      where: {
        trackId_userId: { trackId, userId },
      },
    });

    if (!trackMember) {
      throw new AppError(
        403,
        "You must be a member of the track to send messages"
      );
    }

    return this.prisma.message.create({
      data: {
        content: data.content,
        userId,
        trackId,
        parentId: data.parentId || null,
        ...(data.attachments ? { attachments: data.attachments } : {}),
        readBy: [userId], // author logically has read their own message
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async getMessages(
    userId: string,
    trackId: string,
    limit = 50,
    cursor?: string
  ) {
    // Check if user is in track
    const trackMember = await this.prisma.trackMember.findUnique({
      where: {
        trackId_userId: { trackId, userId },
      },
    });

    if (!trackMember) {
      throw new AppError(
        403,
        "You must be a member of the track to view messages"
      );
    }

    const messages = await this.prisma.message.findMany({
      where: { trackId, parentId: null }, // Default chat fetches root threads
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

    // Sort to ascending for UI rendering (oldest first at top of screen)
    return {
      items: messages.reverse(),
      nextCursor,
    };
  }

  async editMessage(userId: string, messageId: string, data: EditMessageDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new AppError(404, "Message not found");
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

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new AppError(404, "Message not found");
    if (message.userId !== userId)
      throw new AppError(403, "You can only delete your own messages");

    await this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  private async assertTrackMember(trackId: string, userId: string) {
    const member = await this.prisma.trackMember.findUnique({
      where: { trackId_userId: { trackId, userId } },
    });
    if (!member) {
      throw new AppError(403, "You must be a member of the track");
    }
  }

  async setPinned(
    userId: string,
    role: Role,
    messageId: string,
    pinned: boolean
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new AppError(404, "Message not found");

    await this.assertTrackMember(message.trackId, userId);
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

  async toggleReaction(userId: string, messageId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new AppError(404, "Message not found");

    await this.assertTrackMember(message.trackId, userId);

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

  async markRead(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new AppError(404, "Message not found");

    await this.assertTrackMember(message.trackId, userId);

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
