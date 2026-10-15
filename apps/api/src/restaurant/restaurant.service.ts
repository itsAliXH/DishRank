import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, ContentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryService } from '../category/category.service';
import { UserCreateRestaurantDto } from './restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(
    private prisma: PrismaService,
    private categories: CategoryService,
  ) {}

  /** Public / form list: approved + active only. Optional city filter + pagination. */
  async listPublic(cityId?: string, limit?: number, offset = 0) {
    const where = {
      approvalStatus: ApprovalStatus.APPROVED,
      status: ContentStatus.ACTIVE,
      city: { isActive: true },
      ...(cityId ? { cityId } : {}),
    };

    const include = {
      city: true,
      dishes: {
        where: {
          status: ApprovalStatus.APPROVED,
          visibility: ContentStatus.ACTIVE,
        },
        orderBy: [{ avgRating: 'desc' as const }, { reviewCount: 'desc' as const }],
        take: 3,
        select: {
          id: true,
          name: true,
          category: true,
          imageUrl: true,
          avgRating: true,
          reviewCount: true,
          price: true,
        },
      },
      _count: {
        select: {
          dishes: {
            where: {
              status: ApprovalStatus.APPROVED,
              visibility: ContentStatus.ACTIVE,
            },
          },
        },
      },
    };

    if (limit == null) {
      return this.prisma.restaurant.findMany({
        where,
        orderBy: { name: 'asc' },
        include,
      });
    }

    const take = Math.min(Math.max(limit, 1), 50);
    const skip = Math.max(offset, 0);

    const [items, total] = await Promise.all([
      this.prisma.restaurant.findMany({
        where,
        orderBy: { name: 'asc' },
        include,
        take,
        skip,
      }),
      this.prisma.restaurant.count({ where }),
    ]);

    return {
      items,
      total,
      limit: take,
      offset: skip,
      hasMore: skip + items.length < total,
    };
  }

  /**
   * Name autocomplete for add-restaurant forms.
   * Same ranking idea as categories: prefix first, then same first letter, then fuzzy.
   */
  async suggest(q?: string, cityId?: string, limit = 12) {
    const query = q?.trim() || '';
    const baseWhere = {
      approvalStatus: ApprovalStatus.APPROVED,
      status: ContentStatus.ACTIVE,
      city: { isActive: true },
      ...(cityId ? { cityId } : {}),
    };

    if (!query) {
      return this.prisma.restaurant.findMany({
        where: baseWhere,
        orderBy: { name: 'asc' },
        take: limit,
        include: { city: true },
      });
    }

    const first = query[0] ?? '';
    const allowFuzzy = query.length >= 3;

    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        name: string;
        address: string;
        cityId: string;
        lat: number;
        lng: number;
        imageUrl: string | null;
      }[]
    >`
      SELECT r.id, r.name, r.address, r."cityId", r.lat, r.lng, r."imageUrl"
      FROM "Restaurant" r
      INNER JOIN "City" c ON c.id = r."cityId"
      WHERE r."approvalStatus" = 'APPROVED'
        AND r.status = 'ACTIVE'
        AND c."isActive" = true
        AND (${cityId ?? null}::text IS NULL OR r."cityId" = ${cityId ?? null})
        AND (
          lower(r.name) LIKE lower(${query}) || '%'
          OR lower(left(r.name, 1)) = lower(${first})
          OR (
            ${allowFuzzy}
            AND (
              r.name ILIKE '%' || ${query} || '%'
              OR lower(r.name) % lower(${query})
              OR word_similarity(lower(${query}), lower(r.name)) >= 0.28
            )
          )
        )
      ORDER BY
        CASE
          WHEN lower(r.name) = lower(${query}) THEN 0
          WHEN lower(r.name) LIKE lower(${query}) || '%' THEN 1
          WHEN lower(r.name) LIKE '%' || lower(${query}) || '%' THEN 2
          WHEN ${allowFuzzy} AND GREATEST(
            similarity(lower(r.name), lower(${query})),
            word_similarity(lower(${query}), lower(r.name))
          ) >= 0.35 THEN 3
          WHEN lower(left(r.name, 1)) = lower(${first}) THEN 4
          ELSE 5
        END ASC,
        GREATEST(
          similarity(lower(r.name), lower(${query})),
          word_similarity(lower(${query}), lower(r.name))
        ) DESC,
        r.name ASC
      LIMIT ${limit}
    `;

    if (rows.length === 0) return [];

    const cities = await this.prisma.city.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.cityId))] } },
    });
    const cityById = new Map(cities.map((c) => [c.id, c]));

    return rows.map((r) => ({
      ...r,
      city: cityById.get(r.cityId) ?? null,
    }));
  }

  async findById(id: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id,
        approvalStatus: ApprovalStatus.APPROVED,
        status: ContentStatus.ACTIVE,
        city: { isActive: true },
      },
      include: {
        city: true,
        dishes: {
          where: {
            status: ApprovalStatus.APPROVED,
            visibility: ContentStatus.ACTIVE,
          },
          include: { categoryRef: true },
          orderBy: { avgRating: 'desc' },
        },
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  /**
   * Community suggestion — pending until admin approval.
   * Submitter is NOT the owner; claimedBy stays null until admin assigns a restaurant contact.
   */
  async submit(dto: UserCreateRestaurantDto, _userId: string) {
    const city = await this.prisma.city.findFirst({
      where: { id: dto.cityId, isActive: true },
    });
    if (!city) throw new BadRequestException('Invalid or disabled city');

    const dishCreates = dto.dishes?.length
      ? await Promise.all(
          dto.dishes.map(async (dish) => {
            const cat = await this.categories.resolveId(dish.categoryId, dish.category);
            return {
              name: dish.name,
              categoryId: cat.id,
              category: cat.name,
              price: dish.price,
              status: ApprovalStatus.PENDING,
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
        claimedBy: null,
        status: ContentStatus.ACTIVE,
        approvalStatus: ApprovalStatus.PENDING,
        dishes: dishCreates?.length ? { create: dishCreates } : undefined,
      },
      include: { dishes: true, city: true },
    });
  }
}
