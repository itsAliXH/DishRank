import { Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, ContentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarkService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      include: {
        dish: {
          include: {
            restaurant: { include: { city: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    return bookmarks
      .filter(
        (b) =>
          b.dish.status === ApprovalStatus.APPROVED &&
          b.dish.visibility === ContentStatus.ACTIVE &&
          b.dish.restaurant.approvalStatus === ApprovalStatus.APPROVED &&
          b.dish.restaurant.status === ContentStatus.ACTIVE &&
          b.dish.restaurant.city.isActive,
      )
      .map((b) => b.dish);
  }

  async listIds(userId: string) {
    const rows = await this.prisma.bookmark.findMany({
      where: { userId },
      select: { dishId: true },
    });
    return rows.map((r) => r.dishId);
  }

  async isSaved(userId: string, dishId: string) {
    const row = await this.prisma.bookmark.findUnique({
      where: { userId_dishId: { userId, dishId } },
    });
    return { saved: !!row };
  }

  async save(userId: string, dishId: string) {
    const dish = await this.prisma.dish.findFirst({
      where: {
        id: dishId,
        status: ApprovalStatus.APPROVED,
        visibility: ContentStatus.ACTIVE,
      },
    });
    if (!dish) throw new NotFoundException('Dish not found');

    await this.prisma.bookmark.upsert({
      where: { userId_dishId: { userId, dishId } },
      create: { userId, dishId },
      update: {},
    });
    return { saved: true, dishId };
  }

  async unsave(userId: string, dishId: string) {
    await this.prisma.bookmark.deleteMany({
      where: { userId, dishId },
    });
    return { saved: false, dishId };
  }

  async toggle(userId: string, dishId: string) {
    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_dishId: { userId, dishId } },
    });
    if (existing) {
      return this.unsave(userId, dishId);
    }
    return this.save(userId, dishId);
  }
}
