import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, ContentStatus, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminBulkUpdateCitiesDto,
  AdminApproveDishDto,
  AdminApproveRestaurantDto,
  AdminCreateCityDto,
  AdminCreateDishDto,
  AdminCreateRestaurantDto,
  AdminCreateUserDto,
  AdminUpdateCityDto,
  AdminUpdateDishCategoryDto,
  AdminUpdateDishImageDto,
  AdminUpdateRestaurantDto,
  AdminUpdateRestaurantImageDto,
  AdminUpdateRestaurantPermissionsDto,
  AdminUpdateUserDto,
} from './admin.dto';
import { normalizeImageUrl } from '../utils/image-url';
import { CategoryService } from '../category/category.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private categories: CategoryService,
  ) {}

  /**
   * Aggregated admin dashboard stats.
   * Scope: optional province and/or cityId (country is Pakistan-first on the client).
   */
  async getDashboardStats(filters: { province?: string; cityId?: string }) {
    const province = filters.province?.trim() || undefined;
    const cityId = filters.cityId?.trim() || undefined;

    const cityScope =
      cityId || province
        ? {
            ...(cityId ? { id: cityId } : {}),
            ...(province ? { province } : {}),
          }
        : undefined;

    const restaurantWhere = cityScope ? { city: cityScope } : {};
    const dishWhere = cityScope
      ? { restaurant: { city: cityScope } }
      : {};
    const reviewWhere = cityScope
      ? { dish: { restaurant: { city: cityScope } } }
      : {};
    const cityWhere = cityScope ?? {};

    const [
      restaurantRows,
      dishRows,
      reviewRows,
      cityRows,
      userRows,
      scopedCity,
      restPending,
      dishPending,
      reviewPending,
    ] = await Promise.all([
      this.prisma.restaurant.findMany({
        where: restaurantWhere,
        select: {
          status: true,
          approvalStatus: true,
          claimedBy: true,
          receiptVerifyEnabled: true,
        },
      }),
      this.prisma.dish.findMany({
        where: dishWhere,
        select: { visibility: true, status: true },
      }),
      this.prisma.review.findMany({
        where: reviewWhere,
        select: { verified: true, status: true },
      }),
      this.prisma.city.findMany({
        where: cityWhere,
        select: { isActive: true },
      }),
      // Users are platform-wide (not geo-scoped)
      this.prisma.user.findMany({
        select: { status: true, role: true },
      }),
      cityId
        ? this.prisma.city.findUnique({
            where: { id: cityId },
            select: { id: true, name: true, province: true },
          })
        : Promise.resolve(null),
      this.prisma.restaurant.count({
        where: { ...restaurantWhere, approvalStatus: ApprovalStatus.PENDING },
      }),
      this.prisma.dish.count({
        where: { ...dishWhere, status: ApprovalStatus.PENDING },
      }),
      this.prisma.review.count({
        where: { ...reviewWhere, status: ApprovalStatus.PENDING },
      }),
    ]);

    const restaurants = {
      total: restaurantRows.length,
      active: restaurantRows.filter((r) => r.status === ContentStatus.ACTIVE).length,
      inactive: restaurantRows.filter((r) => r.status === ContentStatus.HIDDEN).length,
      banned: restaurantRows.filter((r) => r.status === ContentStatus.BLOCKED).length,
      pendingApproval: restaurantRows.filter(
        (r) => r.approvalStatus === ApprovalStatus.PENDING,
      ).length,
      rejected: restaurantRows.filter(
        (r) => r.approvalStatus === ApprovalStatus.REJECTED,
      ).length,
      withOwner: restaurantRows.filter((r) => !!r.claimedBy).length,
      withoutOwner: restaurantRows.filter((r) => !r.claimedBy).length,
      receiptVerifyOn: restaurantRows.filter((r) => r.receiptVerifyEnabled).length,
      receiptVerifyOff: restaurantRows.filter((r) => !r.receiptVerifyEnabled).length,
    };

    const dishes = {
      total: dishRows.length,
      active: dishRows.filter((d) => d.visibility === ContentStatus.ACTIVE).length,
      inactive: dishRows.filter((d) => d.visibility === ContentStatus.HIDDEN).length,
      banned: dishRows.filter((d) => d.visibility === ContentStatus.BLOCKED).length,
      pendingApproval: dishRows.filter((d) => d.status === ApprovalStatus.PENDING).length,
      rejected: dishRows.filter((d) => d.status === ApprovalStatus.REJECTED).length,
    };

    const reviews = {
      total: reviewRows.length,
      verified: reviewRows.filter((r) => r.verified).length,
      unverified: reviewRows.filter((r) => !r.verified).length,
      pendingApproval: reviewRows.filter((r) => r.status === ApprovalStatus.PENDING).length,
      hidden: reviewRows.filter((r) => r.status === ApprovalStatus.REJECTED).length,
    };

    const cities = {
      total: cityRows.length,
      active: cityRows.filter((c) => c.isActive).length,
      inactive: cityRows.filter((c) => !c.isActive).length,
    };

    const users = {
      total: userRows.length,
      active: userRows.filter((u) => u.status === UserStatus.ACTIVE).length,
      deactivated: userRows.filter((u) => u.status === UserStatus.DEACTIVATED).length,
      banned: userRows.filter((u) => u.status === UserStatus.BANNED).length,
      owners: userRows.filter((u) => u.role === UserRole.RESTAURANT_OWNER).length,
    };

    return {
      scope: {
        country: 'Pakistan',
        province: scopedCity?.province ?? province ?? null,
        cityId: scopedCity?.id ?? cityId ?? null,
        cityName: scopedCity?.name ?? null,
      },
      restaurants,
      dishes,
      reviews,
      cities,
      users,
      inbox: {
        restaurants: restPending,
        dishes: dishPending,
        reviews: reviewPending,
        total: restPending + dishPending + reviewPending,
      },
    };
  }

  async getPending() {
    const [restaurants, dishes, reviews] = await Promise.all([
      this.prisma.restaurant.findMany({
        where: { approvalStatus: ApprovalStatus.PENDING },
        include: {
          city: { select: { id: true, name: true, province: true } },
          dishes: true,
          _count: { select: { dishes: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.dish.findMany({
        where: { status: ApprovalStatus.PENDING },
        include: {
          restaurant: {
            include: {
              city: { select: { id: true, name: true, province: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.review.findMany({
        where: { status: ApprovalStatus.PENDING },
        include: {
          user: { select: { id: true, name: true } },
          dish: {
            select: {
              id: true,
              name: true,
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  city: { select: { id: true, name: true, province: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { restaurants, dishes, reviews };
  }

  listRestaurants() {
    return this.prisma.restaurant.findMany({
      include: {
        _count: { select: { dishes: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Admin Permissions tab — restaurants with feature flags. */
  listRestaurantPermissions() {
    return this.prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        reviewsEnabled: true,
        receiptVerifyEnabled: true,
        allowGeneralReviews: true,
        requireOnSiteLocation: true,
        communityDishSubmitEnabled: true,
        status: true,
        approvalStatus: true,
        city: { select: { id: true, name: true, province: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { dishes: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateRestaurantPermissions(id: string, dto: AdminUpdateRestaurantPermissionsDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const hasField =
      dto.reviewsEnabled !== undefined ||
      dto.receiptVerifyEnabled !== undefined ||
      dto.allowGeneralReviews !== undefined ||
      dto.requireOnSiteLocation !== undefined ||
      dto.communityDishSubmitEnabled !== undefined;
    if (!hasField) {
      throw new BadRequestException('No permission fields to update');
    }

    const nextVerifiedMode =
      dto.receiptVerifyEnabled !== undefined
        ? dto.receiptVerifyEnabled
        : restaurant.receiptVerifyEnabled;
    // General-only mode always “allows general”; Verified mode uses the explicit flag.
    const nextAllowGeneral = !nextVerifiedMode
      ? true
      : dto.allowGeneralReviews !== undefined
        ? dto.allowGeneralReviews
        : restaurant.allowGeneralReviews;

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        ...(dto.reviewsEnabled !== undefined ? { reviewsEnabled: dto.reviewsEnabled } : {}),
        ...(dto.receiptVerifyEnabled !== undefined
          ? { receiptVerifyEnabled: dto.receiptVerifyEnabled, receiptRequired: false }
          : {}),
        allowGeneralReviews: nextAllowGeneral,
        ...(dto.requireOnSiteLocation !== undefined
          ? { requireOnSiteLocation: dto.requireOnSiteLocation }
          : {}),
        ...(dto.communityDishSubmitEnabled !== undefined
          ? { communityDishSubmitEnabled: dto.communityDishSubmitEnabled }
          : {}),
      },
      select: {
        id: true,
        name: true,
        address: true,
        reviewsEnabled: true,
        receiptVerifyEnabled: true,
        allowGeneralReviews: true,
        requireOnSiteLocation: true,
        communityDishSubmitEnabled: true,
        status: true,
        approvalStatus: true,
        city: { select: { id: true, name: true, province: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { dishes: true } },
      },
    });
  }

  /** Full catalog for admin manage UI (restaurants + all dishes + owner). */
  listRestaurantsWithDishes() {
    return this.prisma.restaurant.findMany({
      include: {
        city: true,
        dishes: {
          orderBy: [{ avgRating: 'desc' }, { name: 'asc' }],
        },
        owner: {
          select: { id: true, name: true, email: true, role: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  listCities() {
    return this.prisma.city.findMany({
      include: { _count: { select: { restaurants: true } } },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
    });
  }

  async createCity(dto: AdminCreateCityDto) {
    const name = dto.name.trim();
    const province = dto.province.trim();
    if (!name || !province) {
      throw new BadRequestException('Name and province are required');
    }

    const existing = await this.prisma.city.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('A city with this name already exists');

    return this.prisma.city.create({
      data: {
        name,
        province,
        isActive: dto.isActive ?? false,
      },
      include: { _count: { select: { restaurants: true } } },
    });
  }

  async bulkUpdateCities(dto: AdminBulkUpdateCitiesDto) {
    const ids = [...new Set(dto.ids.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) throw new BadRequestException('Select at least one city');

    await this.prisma.city.updateMany({
      where: { id: { in: ids } },
      data: { isActive: dto.isActive },
    });

    return this.prisma.city.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { restaurants: true } } },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
    });
  }

  async updateCity(id: string, dto: AdminUpdateCityDto) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('City not found');

    const data: { name?: string; province?: string; isActive?: boolean } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Name cannot be empty');
      const clash = await this.prisma.city.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (clash) throw new ConflictException('A city with this name already exists');
      data.name = name;
    }
    if (dto.province !== undefined) {
      const province = dto.province.trim();
      if (!province) throw new BadRequestException('Province cannot be empty');
      data.province = province;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.city.update({
      where: { id },
      data,
      include: { _count: { select: { restaurants: true } } },
    });
  }

  async createRestaurant(dto: AdminCreateRestaurantDto) {
    const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
    if (!city) throw new BadRequestException('Invalid city');
    if (!city.isActive) {
      throw new BadRequestException('City is disabled — enable it before adding restaurants');
    }

    const dishCreates = dto.dishes?.length
      ? await Promise.all(
          dto.dishes.map(async (dish) => {
            const cat = await this.categories.resolveId(dish.categoryId, dish.category);
            return {
              name: dish.name,
              categoryId: cat.id,
              category: cat.name,
              price: dish.price,
              imageUrl: normalizeImageUrl(dish.imageUrl),
              status: ApprovalStatus.APPROVED,
              visibility: ContentStatus.ACTIVE,
            };
          }),
        )
      : undefined;

    return this.prisma.restaurant.create({
      data: {
        name: dto.name,
        address: dto.address,
        cityId: dto.cityId,
        lat: dto.lat,
        lng: dto.lng,
        imageUrl: normalizeImageUrl(dto.imageUrl),
        status: ContentStatus.ACTIVE,
        approvalStatus: ApprovalStatus.APPROVED,
        dishes: dishCreates?.length ? { create: dishCreates } : undefined,
      },
      include: { dishes: true, city: true },
    });
  }

  async updateRestaurant(id: string, dto: AdminUpdateRestaurantDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
    if (!city) throw new BadRequestException('Invalid city');
    if (!city.isActive) {
      throw new BadRequestException('City is disabled — enable it before assigning restaurants');
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
      where: { id },
      data,
      include: {
        city: true,
        dishes: {
          orderBy: [{ avgRating: 'desc' }, { name: 'asc' }],
        },
        owner: {
          select: { id: true, name: true, email: true, role: true, status: true },
        },
      },
    });
  }

  async updateRestaurantImage(id: string, dto: AdminUpdateRestaurantImageDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return this.prisma.restaurant.update({
      where: { id },
      data: { imageUrl: normalizeImageUrl(dto.imageUrl) },
      include: {
        dishes: true,
        owner: {
          select: { id: true, name: true, email: true, role: true, status: true },
        },
      },
    });
  }

  async updateDishImage(id: string, dto: AdminUpdateDishImageDto) {
    const dish = await this.prisma.dish.findUnique({ where: { id } });
    if (!dish) throw new NotFoundException('Dish not found');
    return this.prisma.dish.update({
      where: { id },
      data: { imageUrl: normalizeImageUrl(dto.imageUrl) },
      include: { restaurant: true },
    });
  }

  async createDish(restaurantId: string, dto: AdminCreateDishDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const cat = await this.categories.resolveId(dto.categoryId, dto.category);

    return this.prisma.dish.create({
      data: {
        name: dto.name,
        restaurantId,
        categoryId: cat.id,
        category: cat.name,
        price: dto.price,
        imageUrl: normalizeImageUrl(dto.imageUrl),
        status: ApprovalStatus.APPROVED,
        visibility: ContentStatus.ACTIVE,
      },
      include: { restaurant: true, categoryRef: true },
    });
  }

  async updateDishCategory(id: string, dto: AdminUpdateDishCategoryDto) {
    const dish = await this.prisma.dish.findUnique({ where: { id } });
    if (!dish) throw new NotFoundException('Dish not found');
    const cat = await this.categories.resolveId(dto.categoryId);
    return this.prisma.dish.update({
      where: { id },
      data: { categoryId: cat.id, category: cat.name },
      include: { restaurant: true, categoryRef: true },
    });
  }

  async setRestaurantStatus(id: string, status: ContentStatus) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return this.prisma.restaurant.update({
      where: { id },
      data: { status },
      include: { dishes: true },
    });
  }

  async setDishVisibility(id: string, visibility: ContentStatus) {
    const dish = await this.prisma.dish.findUnique({ where: { id } });
    if (!dish) throw new NotFoundException('Dish not found');
    return this.prisma.dish.update({
      where: { id },
      data: { visibility },
      include: { restaurant: true },
    });
  }

  async deleteRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    await this.prisma.restaurant.delete({ where: { id } });
    return { ok: true, id };
  }

  async deleteDish(id: string) {
    const dish = await this.prisma.dish.findUnique({ where: { id } });
    if (!dish) throw new NotFoundException('Dish not found');
    await this.prisma.dish.delete({ where: { id } });
    return { ok: true, id };
  }

  async approveRestaurant(id: string, dto: AdminApproveRestaurantDto = {}) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const data: {
      approvalStatus: ApprovalStatus;
      status: ContentStatus;
      name?: string;
      address?: string;
      cityId?: string;
      lat?: number;
      lng?: number;
      imageUrl?: string | null;
    } = {
      approvalStatus: ApprovalStatus.APPROVED,
      status: ContentStatus.ACTIVE,
    };

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.address !== undefined) data.address = dto.address.trim();
    if (dto.lat !== undefined) data.lat = dto.lat;
    if (dto.lng !== undefined) data.lng = dto.lng;
    if (dto.imageUrl !== undefined) data.imageUrl = normalizeImageUrl(dto.imageUrl);

    if (dto.cityId !== undefined) {
      const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
      if (!city) throw new BadRequestException('Invalid city');
      if (!city.isActive) {
        throw new BadRequestException('City is disabled — enable it before assigning restaurants');
      }
      data.cityId = dto.cityId;
    }

    return this.prisma.restaurant.update({
      where: { id },
      data,
      include: { dishes: true, city: true },
    });
  }

  async rejectRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return this.prisma.restaurant.update({
      where: { id },
      data: { approvalStatus: ApprovalStatus.REJECTED },
      include: { dishes: true },
    });
  }

  async approveDish(id: string, dto: AdminApproveDishDto = {}) {
    const dish = await this.prisma.dish.findUnique({
      where: { id },
      include: { restaurant: true },
    });
    if (!dish) throw new NotFoundException('Dish not found');

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
      restaurantPatch.cityId = dto.restaurantCityId;
    }

    if (Object.keys(restaurantPatch).length > 0) {
      await this.prisma.restaurant.update({
        where: { id: dish.restaurantId },
        data: restaurantPatch,
      });
    }

    return this.prisma.dish.update({
      where: { id },
      data: dishData,
      include: {
        restaurant: { include: { city: true } },
        categoryRef: true,
      },
    });
  }

  rejectDish(id: string) {
    return this.prisma.dish.update({
      where: { id },
      data: { status: ApprovalStatus.REJECTED },
    });
  }

  async approveReview(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { verification: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    // Receipt-backed submissions become Verified once an admin approves.
    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        status: ApprovalStatus.APPROVED,
        ...(review.verification ? { verified: true } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        dish: { include: { restaurant: { include: { city: true } } } },
        verification: true,
      },
    });
    await this.recalcDishRatings(review.dishId);
    return updated;
  }

  async rejectReview(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { verification: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    // Pending receipt verify: drop the receipt claim and keep the review as public General.
    if (review.verification && review.status === ApprovalStatus.PENDING) {
      await this.prisma.verification.delete({ where: { reviewId: id } });
      const updated = await this.prisma.review.update({
        where: { id },
        data: { status: ApprovalStatus.APPROVED, verified: false },
        include: {
          user: { select: { id: true, name: true, email: true } },
          dish: { include: { restaurant: { include: { city: true } } } },
          verification: true,
        },
      });
      await this.recalcDishRatings(review.dishId);
      return updated;
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: ApprovalStatus.REJECTED },
      include: {
        user: { select: { id: true, name: true, email: true } },
        dish: { include: { restaurant: { include: { city: true } } } },
        verification: true,
      },
    });
    await this.recalcDishRatings(review.dishId);
    return updated;
  }

  /** All reviews for admin manage UI (search + location / status filters). */
  listReviews(params: {
    q?: string;
    status?: string;
    verified?: string;
    province?: string;
    cityId?: string;
    restaurantId?: string;
    dishId?: string;
  }) {
    const q = params.q?.trim();
    const province = params.province?.trim();
    const cityId = params.cityId?.trim();
    const restaurantId = params.restaurantId?.trim();
    const dishId = params.dishId?.trim();
    const status =
      params.status === 'APPROVED' || params.status === 'REJECTED' || params.status === 'PENDING'
        ? (params.status as ApprovalStatus)
        : undefined;
    const verified =
      params.verified === 'true' ? true : params.verified === 'false' ? false : undefined;

    return this.prisma.review.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(verified !== undefined ? { verified } : {}),
        ...(dishId
          ? { dishId }
          : restaurantId || cityId || province
            ? {
                dish: {
                  ...(restaurantId ? { restaurantId } : {}),
                  ...(!restaurantId && (cityId || province)
                    ? {
                        restaurant: {
                          ...(cityId ? { cityId } : {}),
                          ...(!cityId && province
                            ? { city: { province: { equals: province, mode: 'insensitive' } } }
                            : {}),
                        },
                      }
                    : {}),
                },
              }
            : {}),
        ...(q
          ? {
              OR: [
                { text: { contains: q, mode: 'insensitive' } },
                { user: { name: { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { dish: { name: { contains: q, mode: 'insensitive' } } },
                { dish: { restaurant: { name: { contains: q, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        dish: {
          include: { restaurant: { include: { city: true } } },
        },
        verification: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async recalcDishRatings(dishId: string) {
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

  /** Soft-hide (disable) a review — reversible; drops from public + rating stats. */
  async hideReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: ApprovalStatus.REJECTED },
      include: {
        user: { select: { id: true, name: true, email: true } },
        dish: { include: { restaurant: { include: { city: true } } } },
        verification: true,
      },
    });
    await this.recalcDishRatings(review.dishId);
    return updated;
  }

  /** Restore a soft-hidden / rejected review to public. */
  async restoreReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: ApprovalStatus.APPROVED },
      include: {
        user: { select: { id: true, name: true, email: true } },
        dish: { include: { restaurant: { include: { city: true } } } },
        verification: true,
      },
    });
    await this.recalcDishRatings(review.dishId);
    return updated;
  }

  /** Revoke verification badge if receipt/GPS claim looks bogus (review stays public). */
  async unverifyReview(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { verification: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (!review.verified && !review.verification) {
      throw new BadRequestException('Review is not verified');
    }

    if (review.verification) {
      await this.prisma.verification.delete({ where: { reviewId: id } });
    }

    return this.prisma.review.update({
      where: { id },
      data: { verified: false },
      include: {
        user: { select: { id: true, name: true, email: true } },
        dish: { include: { restaurant: { include: { city: true } } } },
        verification: true,
      },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        _count: { select: { reviews: true } },
        ownedRestaurants: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private normalizePhone(phone: string) {
    return phone.replace(/[^\d+]/g, '');
  }

  private async assertContactFree(
    email?: string,
    phone?: string,
    excludeUserId?: string,
  ) {
    if (email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== excludeUserId) {
        if (existing.status === UserStatus.BANNED) {
          throw new ConflictException('This email cannot be used (banned account)');
        }
        throw new ConflictException('Email already in use');
      }
    }
    if (phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone } });
      if (existing && existing.id !== excludeUserId) {
        if (existing.status === UserStatus.BANNED) {
          throw new ConflictException('This phone number cannot be used (banned account)');
        }
        throw new ConflictException('Phone number already in use');
      }
    }
  }

  private async syncOwnedRestaurants(userId: string, restaurantIds: string[]) {
    const uniqueIds = [...new Set(restaurantIds)];
    if (uniqueIds.length) {
      const found = await this.prisma.restaurant.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      });
      if (found.length !== uniqueIds.length) {
        throw new BadRequestException('One or more restaurants were not found');
      }
    }

    await this.prisma.restaurant.updateMany({
      where: {
        claimedBy: userId,
        ...(uniqueIds.length ? { id: { notIn: uniqueIds } } : {}),
      },
      data: { claimedBy: null },
    });

    if (uniqueIds.length) {
      await this.prisma.restaurant.updateMany({
        where: { id: { in: uniqueIds } },
        data: { claimedBy: userId },
      });
    }
  }

  async updateUser(id: string, dto: AdminUpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const email = dto.email?.trim().toLowerCase();
    const phone =
      dto.phone !== undefined
        ? dto.phone.trim()
          ? this.normalizePhone(dto.phone)
          : null
        : undefined;

    if (email || phone) {
      await this.assertContactFree(email, phone ?? undefined, id);
    }

    if (dto.role && dto.role !== user.role && user.id === actorId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    if (dto.role === UserRole.USER || dto.role === UserRole.RESTAURANT_OWNER) {
      if (user.role === UserRole.ADMIN && user.id !== actorId) {
        const adminCount = await this.prisma.user.count({
          where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
        });
        if (adminCount <= 1) {
          throw new BadRequestException('Cannot demote the last active admin');
        }
      }
    }

    const nextRole = dto.role ?? user.role;

    if (dto.restaurantIds !== undefined) {
      if (nextRole !== UserRole.RESTAURANT_OWNER && dto.restaurantIds.length > 0) {
        throw new BadRequestException(
          'Only restaurant owners can be assigned restaurants. Set role to RESTAURANT_OWNER first.',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        email,
        ...(phone !== undefined ? { phone } : {}),
        role: dto.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (dto.restaurantIds !== undefined) {
      if (nextRole === UserRole.RESTAURANT_OWNER) {
        await this.syncOwnedRestaurants(id, dto.restaurantIds);
      } else {
        await this.syncOwnedRestaurants(id, []);
      }
    } else if (dto.role === UserRole.USER) {
      await this.syncOwnedRestaurants(id, []);
    }

    const ownedRestaurants = await this.prisma.restaurant.findMany({
      where: { claimedBy: id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return { ...updated, ownedRestaurants };
  }

  async setUserPassword(id: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const hashed = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });
    return { ok: true, id };
  }

  async setUserStatus(id: string, status: UserStatus, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.id === actorId) {
      throw new ForbiddenException('You cannot change status on your own account');
    }
    if (
      (status === UserStatus.BANNED || status === UserStatus.DEACTIVATED) &&
      user.role === UserRole.ADMIN
    ) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot disable the last active admin');
      }
    }
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async createUser(dto: AdminCreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone?.trim() ? this.normalizePhone(dto.phone) : undefined;
    await this.assertContactFree(email, phone);

    const password = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? UserRole.RESTAURANT_OWNER;

    if (dto.restaurantIds?.length && role !== UserRole.RESTAURANT_OWNER) {
      throw new BadRequestException('Only restaurant owners can be assigned restaurants');
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        phone,
        password,
        role,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (dto.restaurantIds?.length) {
      await this.syncOwnedRestaurants(user.id, dto.restaurantIds);
    }

    const ownedRestaurants = await this.prisma.restaurant.findMany({
      where: { claimedBy: user.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return { ...user, ownedRestaurants };
  }

  /**
   * Assign restaurant owner only when contacted by the venue.
   * Listing stays public with or without an owner.
   */
  async assignRestaurantOwner(restaurantId: string, userId: string | null | undefined) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    if (!userId) {
      return this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: { claimedBy: null },
        include: {
          dishes: true,
          owner: {
            select: { id: true, name: true, email: true, role: true, status: true },
          },
        },
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === UserStatus.BANNED) {
      throw new BadRequestException('Cannot assign a banned account as owner');
    }

    if (user.role === UserRole.USER) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.RESTAURANT_OWNER },
      });
    }

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { claimedBy: userId },
      include: {
        dishes: true,
        owner: {
          select: { id: true, name: true, email: true, role: true, status: true },
        },
      },
    });
  }
}
