import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, ContentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryService } from '../category/category.service';
import { CreateDishDto } from './dish.dto';

@Injectable()
export class DishService {
  constructor(
    private prisma: PrismaService,
    private categories: CategoryService,
  ) {}

  async findById(id: string) {
    const dish = await this.prisma.dish.findFirst({
      where: {
        id,
        status: ApprovalStatus.APPROVED,
        visibility: ContentStatus.ACTIVE,
        restaurant: {
          status: ContentStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
          city: { isActive: true },
        },
      },
      include: {
        categoryRef: true,
        restaurant: { include: { city: true } },
        reviews: {
          where: { status: ApprovalStatus.APPROVED },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!dish) throw new NotFoundException('Dish not found');
    return dish;
  }

  async getTrending(cityId?: string) {
    return this.prisma.dish.findMany({
      where: {
        status: ApprovalStatus.APPROVED,
        visibility: ContentStatus.ACTIVE,
        restaurant: {
          status: ContentStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
          city: { isActive: true },
          ...(cityId ? { cityId } : {}),
        },
      },
      include: { restaurant: { include: { city: true } }, categoryRef: true },
      orderBy: [{ avgRating: 'desc' }, { reviewCount: 'desc' }],
      take: 5,
    });
  }

  async getRelated(id: string, take = 3) {
    const dish = await this.findById(id);
    return this.prisma.dish.findMany({
      where: {
        id: { not: id },
        categoryId: dish.categoryId,
        status: ApprovalStatus.APPROVED,
        visibility: ContentStatus.ACTIVE,
        restaurant: {
          status: ContentStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
          city: { isActive: true },
        },
      },
      include: { restaurant: true, categoryRef: true },
      orderBy: [{ avgRating: 'desc' }, { reviewCount: 'desc' }],
      take,
    });
  }

  async create(dto: CreateDishDto) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: dto.restaurantId,
        approvalStatus: ApprovalStatus.APPROVED,
        status: ContentStatus.ACTIVE,
        city: { isActive: true },
      },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found or not approved yet');
    }
    if (!restaurant.communityDishSubmitEnabled) {
      throw new BadRequestException(
        'This restaurant is not accepting community dish suggestions',
      );
    }

    const cat = await this.categories.resolveId(dto.categoryId, dto.category);

    return this.prisma.dish.create({
      data: {
        name: dto.name,
        restaurantId: dto.restaurantId,
        categoryId: cat.id,
        category: cat.name,
        price: dto.price,
        status: ApprovalStatus.PENDING,
        visibility: ContentStatus.ACTIVE,
      },
      include: { restaurant: true, categoryRef: true },
    });
  }

  async updateRatingStats(dishId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { dishId, status: ApprovalStatus.APPROVED },
    });
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
    await this.prisma.dish.update({
      where: { id: dishId },
      data: { avgRating, reviewCount: reviews.length },
    });
  }
}
