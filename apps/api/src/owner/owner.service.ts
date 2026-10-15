import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, ContentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryService } from '../category/category.service';
import { normalizeImageUrl } from '../utils/image-url';
import { OwnerApproveDishDto, OwnerUpdateDishCategoryDto, OwnerUpdateImageDto, OwnerUpdateRestaurantDto } from './owner.dto';

@Injectable()
export class OwnerService {
  constructor(
    private prisma: PrismaService,
    private categories: CategoryService,
  ) {}

  private ownedRestaurantFilter(userId: string) {
    return { claimedBy: userId };
  }

  private async requireOwnedRestaurant(userId: string, restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (restaurant.claimedBy !== userId) {
      throw new ForbiddenException('You can only edit restaurants you own');
    }
    return restaurant;
  }

  async getPendingDishes(userId: string) {
    return this.prisma.dish.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        restaurant: this.ownedRestaurantFilter(userId),
      },
      include: {
        restaurant: { include: { city: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listOwnedRestaurants(userId: string) {
    return this.prisma.restaurant.findMany({
      where: this.ownedRestaurantFilter(userId),
      include: {
        city: true,
        dishes: {
          orderBy: [{ avgRating: 'desc' }, { name: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateRestaurant(userId: string, restaurantId: string, dto: OwnerUpdateRestaurantDto) {
    await this.requireOwnedRestaurant(userId, restaurantId);

    const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
    if (!city) throw new BadRequestException('Invalid city');
    if (!city.isActive) {
      throw new BadRequestException('City is disabled — contact DishRank admin');
    }

    const data: {
      name: string;
      address: string;
      cityId: string;
      lat: number;
      lng: number;
      imageUrl?: string | null;
    } = {
      name: dto.name.trim(),
      address: dto.address.trim(),
      cityId: dto.cityId,
      lat: dto.lat,
      lng: dto.lng,
    };

    if (dto.imageUrl !== undefined) {
      data.imageUrl = normalizeImageUrl(dto.imageUrl);
    }

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data,
      include: {
        city: true,
        dishes: {
          orderBy: [{ avgRating: 'desc' }, { name: 'asc' }],
        },
      },
    });
  }

  async updateRestaurantImage(userId: string, restaurantId: string, dto: OwnerUpdateImageDto) {
    await this.requireOwnedRestaurant(userId, restaurantId);

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { imageUrl: normalizeImageUrl(dto.imageUrl) },
      include: {
        city: true,
        dishes: {
          orderBy: [{ avgRating: 'desc' }, { name: 'asc' }],
        },
      },
    });
  }

  async updateDishImage(userId: string, dishId: string, dto: OwnerUpdateImageDto) {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      include: { restaurant: true },
    });
    if (!dish) throw new NotFoundException('Dish not found');
    if (dish.restaurant.claimedBy !== userId) {
      throw new ForbiddenException('You can only update pictures for dishes at restaurants you own');
    }

    return this.prisma.dish.update({
      where: { id: dishId },
      data: { imageUrl: normalizeImageUrl(dto.imageUrl) },
      include: { restaurant: { include: { city: true } }, categoryRef: true },
    });
  }

  async updateDishCategory(userId: string, dishId: string, dto: OwnerUpdateDishCategoryDto) {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      include: { restaurant: true },
    });
    if (!dish) throw new NotFoundException('Dish not found');
    if (dish.restaurant.claimedBy !== userId) {
      throw new ForbiddenException('You can only update categories for dishes at restaurants you own');
    }

    const cat = await this.categories.resolveId(dto.categoryId);
    return this.prisma.dish.update({
      where: { id: dishId },
      data: { categoryId: cat.id, category: cat.name },
      include: { restaurant: { include: { city: true } }, categoryRef: true },
    });
  }

  async approveDish(userId: string, dishId: string, dto: OwnerApproveDishDto = {}) {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      include: { restaurant: true },
    });
    if (!dish) throw new NotFoundException('Dish not found');
    if (dish.restaurant.claimedBy !== userId) {
      throw new ForbiddenException('You can only approve dishes for your restaurants');
    }
    if (dish.restaurant.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException('Restaurant must be approved first');
    }

    const dishData: {
      status: ApprovalStatus;
      visibility: ContentStatus;
      name?: string;
      categoryId?: string;
      category?: string;
      price?: number | null;
      imageUrl?: string | null;
    } = {
      status: ApprovalStatus.APPROVED,
      visibility: ContentStatus.ACTIVE,
    };

    if (dto.name !== undefined) dishData.name = dto.name.trim();
    if (dto.price !== undefined) dishData.price = dto.price;
    if (dto.imageUrl !== undefined) dishData.imageUrl = normalizeImageUrl(dto.imageUrl);
    if (dto.categoryId) {
      const cat = await this.categories.resolveId(dto.categoryId);
      dishData.categoryId = cat.id;
      dishData.category = cat.name;
    }

    const restaurantPatch: {
      lat?: number;
      lng?: number;
      address?: string;
      cityId?: string;
    } = {};
    if (dto.restaurantLat !== undefined) restaurantPatch.lat = dto.restaurantLat;
    if (dto.restaurantLng !== undefined) restaurantPatch.lng = dto.restaurantLng;
    if (dto.restaurantAddress !== undefined) {
      restaurantPatch.address = dto.restaurantAddress.trim();
    }
    if (dto.restaurantCityId !== undefined) {
      const city = await this.prisma.city.findUnique({ where: { id: dto.restaurantCityId } });
      if (!city) throw new BadRequestException('Invalid city');
      if (!city.isActive) {
        throw new BadRequestException('City is disabled — contact DishRank admin');
      }
      restaurantPatch.cityId = dto.restaurantCityId;
    }

    if (Object.keys(restaurantPatch).length > 0) {
      await this.prisma.restaurant.update({
        where: { id: dish.restaurantId },
        data: restaurantPatch,
      });
    }

    return this.prisma.dish.update({
      where: { id: dishId },
      data: dishData,
      include: { restaurant: { include: { city: true } }, categoryRef: true },
    });
  }

  async rejectDish(userId: string, dishId: string) {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      include: { restaurant: true },
    });
    if (!dish) throw new NotFoundException('Dish not found');
    if (dish.restaurant.claimedBy !== userId) {
      throw new ForbiddenException('You can only reject dishes for your restaurants');
    }

    return this.prisma.dish.update({
      where: { id: dishId },
      data: { status: ApprovalStatus.REJECTED },
      include: { restaurant: { include: { city: true } } },
    });
  }
}
