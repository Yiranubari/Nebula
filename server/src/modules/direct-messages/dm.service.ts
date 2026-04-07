import { BaseService } from "../../core/BaseService";
import { SendDmDto } from "./dm.schemas";
import { AppError } from "../../utils/AppError";

export class DmService extends BaseService {
  async sendDm(fromUserId: string, toUserId: string, data: SendDmDto) {
    if (fromUserId === toUserId) {
      throw new AppError(400, "You cannot send a direct message to yourself");
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: toUserId },
    });

    if (!targetUser) throw new AppError(404, "Target user not found");

    return this.prisma.directMessage.create({
      data: {
        content: data.content,
        fromUserId,
        toUserId,
        readBy: [fromUserId], // Sender implicitly reads it
      },
      include: {
        from: { select: { id: true, name: true, avatar: true } },
        to: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async getConversation(
    userId: string,
    targetUserId: string,
    limit = 50,
    cursor?: string
  ) {
    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [
          { fromUserId: userId, toUserId: targetUserId },
          { fromUserId: targetUserId, toUserId: userId },
        ],
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        from: { select: { id: true, name: true, avatar: true } },
        to: { select: { id: true, name: true, avatar: true } },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    // Reverse for ascending chronological display
    return {
      items: messages.reverse(),
      nextCursor,
    };
  }

  async deleteOwnDm(userId: string, messageId: string) {
    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new AppError(404, "Message not found");
    if (message.fromUserId !== userId) {
      throw new AppError(403, "You can only delete your own messages");
    }

    await this.prisma.directMessage.delete({
      where: { id: messageId },
    });
  }
}
