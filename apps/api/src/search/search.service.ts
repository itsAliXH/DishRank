import { Injectable } from '@nestjs/common';
import { ApprovalStatus, ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { haversineKm } from '../utils/geo';

/** Minimum trigram / word similarity to treat as a fuzzy match (0–1). */
const FUZZY_MIN = 0.28;

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(params: {
    q?: string;
    type?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    minRating?: number;
    sort?: string;
    cityId?: string;
    category?: string;
  }) {
    if (params.type === 'restaurant') {
      return this.searchRestaurants(params);
    }
    return this.searchDishes(params);
  }

  private async searchRestaurants(params: {
    q?: string;
    cityId?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    sort?: string;
  }) {
    const q = params.q || '';
    const cityId = params.cityId;
    const hasLocation = params.lat != null && params.lng != null;
    const radius = params.radius || 5;
    const sortByDistance =
      hasLocation && (params.sort === 'distance' || params.radius != null);

    if (!q.trim()) {
      const rows = await this.prisma.restaurant.findMany({
        where: {
          approvalStatus: ApprovalStatus.APPROVED,
          status: ContentStatus.ACTIVE,
          city: { isActive: true },
          ...(cityId ? { cityId } : {}),
        },
        include: {
          city: true,
          dishes: {
            where: {
              status: ApprovalStatus.APPROVED,
              visibility: ContentStatus.ACTIVE,
            },
            select: { avgRating: true, reviewCount: true },
          },
        },
        take: sortByDistance ? 120 : 50,
        orderBy: { name: 'asc' },
      });

      const ranked = rows.map(({ dishes, ...restaurant }) => {
        const scored = dishes.length
          ? dishes.reduce((sum, d) => sum + d.avgRating, 0) / dishes.length
          : 0;
        const reviews = dishes.reduce((sum, d) => sum + d.reviewCount, 0);
        return { restaurant, score: scored, reviews };
      });

      if (sortByDistance) {
        return ranked
          .map((x) => ({
            ...x,
            distance: haversineKm(
              params.lat!,
              params.lng!,
              x.restaurant.lat,
              x.restaurant.lng,
            ),
          }))
          .filter((x) => x.distance <= radius)
          .sort((a, b) => a.distance - b.distance || b.score - a.score)
          .slice(0, 20)
          .map(({ restaurant }) => restaurant);
      }

      return ranked
        .sort((a, b) => b.score - a.score || b.reviews - a.reviews)
        .slice(0, 20)
        .map(({ restaurant }) => restaurant);
    }

    const restaurants = await this.fetchRestaurantsByQuery(q.trim(), cityId);

    if (sortByDistance) {
      return restaurants
        .map((restaurant) => ({
          restaurant,
          distance: haversineKm(
            params.lat!,
            params.lng!,
            restaurant.lat,
            restaurant.lng,
          ),
        }))
        .filter((x) => x.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .map(({ restaurant }) => restaurant);
    }

    return restaurants;
  }

  private async fetchRestaurantsByQuery(query: string, cityId?: string) {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT r.id
      FROM "Restaurant" r
      INNER JOIN "City" c ON c.id = r."cityId"
      WHERE r."approvalStatus" = 'APPROVED'
        AND r.status = 'ACTIVE'
        AND c."isActive" = true
        AND (${cityId ?? null}::text IS NULL OR r."cityId" = ${cityId ?? null})
        AND (
          lower(r.name) % lower(${query})
          OR r.name ILIKE '%' || ${query} || '%'
          OR word_similarity(lower(${query}), lower(r.name)) >= ${FUZZY_MIN}
        )
      ORDER BY GREATEST(
        similarity(lower(r.name), lower(${query})),
        word_similarity(lower(${query}), lower(r.name))
      ) DESC,
      r.name ASC
      LIMIT 40
    `;

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const restaurants = await this.prisma.restaurant.findMany({
      where: { id: { in: ids } },
      include: { city: true },
    });
    const byId = new Map(restaurants.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as typeof restaurants;
  }

  private async searchDishes(params: {
    q?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    minRating?: number;
    sort?: string;
    cityId?: string;
    category?: string;
  }) {
    const sort = params.sort || 'rating';
    const hasLocation = params.lat != null && params.lng != null;
    const radius = params.radius || 5;
    const minRating = params.minRating ?? null;
    const cityId = params.cityId ?? null;
    const category = params.category?.trim() || null;
    const query = params.q?.trim() || '';

    let dishIds: string[];

    if (query) {
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT d.id
        FROM "Dish" d
        INNER JOIN "Restaurant" r ON r.id = d."restaurantId"
        INNER JOIN "City" c ON c.id = r."cityId"
        WHERE d.status = 'APPROVED'
          AND d.visibility = 'ACTIVE'
          AND r.status = 'ACTIVE'
          AND r."approvalStatus" = 'APPROVED'
          AND c."isActive" = true
          AND (${cityId}::text IS NULL OR r."cityId" = ${cityId})
          AND (${category}::text IS NULL OR lower(d.category) = lower(${category}))
          AND (${minRating}::float IS NULL OR d."avgRating" >= ${minRating})
          AND (
            lower(d.name) % lower(${query})
            OR lower(d.category) % lower(${query})
            OR d.name ILIKE '%' || ${query} || '%'
            OR d.category ILIKE '%' || ${query} || '%'
            OR word_similarity(lower(${query}), lower(d.name)) >= ${FUZZY_MIN}
            OR word_similarity(lower(${query}), lower(d.category)) >= ${FUZZY_MIN}
          )
        ORDER BY GREATEST(
          similarity(lower(d.name), lower(${query})),
          similarity(lower(d.category), lower(${query})),
          word_similarity(lower(${query}), lower(d.name)),
          word_similarity(lower(${query}), lower(d.category))
        ) DESC,
        d."avgRating" DESC,
        d."reviewCount" DESC
        LIMIT 50
      `;
      dishIds = rows.map((r) => r.id);
    } else {
      const restaurantFilter: Prisma.RestaurantWhereInput = {
        status: ContentStatus.ACTIVE,
        approvalStatus: ApprovalStatus.APPROVED,
        city: { isActive: true },
        ...(cityId ? { cityId } : {}),
      };
      const where: Prisma.DishWhereInput = {
        status: ApprovalStatus.APPROVED,
        visibility: ContentStatus.ACTIVE,
        restaurant: restaurantFilter,
        ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
        ...(minRating != null ? { avgRating: { gte: minRating } } : {}),
      };
      const dishes = await this.prisma.dish.findMany({
        where,
        select: { id: true },
        take: 50,
        orderBy: [{ avgRating: 'desc' }, { reviewCount: 'desc' }],
      });
      dishIds = dishes.map((d) => d.id);
    }

    if (dishIds.length === 0) return [];

    const dishes = await this.prisma.dish.findMany({
      where: { id: { in: dishIds } },
      include: { restaurant: { include: { city: true } } },
    });
    const byId = new Map(dishes.map((d) => [d.id, d]));
    let ordered = dishIds.map((id) => byId.get(id)).filter(Boolean) as typeof dishes;

    if (sort === 'distance' && hasLocation) {
      return ordered
        .map((d) => ({
          dish: d,
          distance: haversineKm(params.lat!, params.lng!, d.restaurant.lat, d.restaurant.lng),
        }))
        .filter((x) => x.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .map((x) => x.dish);
    }

    if (query && sort === 'rating') {
      // Keep fuzzy relevance order from SQL for rated search with a query
      return ordered;
    }

    return [...ordered].sort((a, b) => {
      if (sort === 'price') {
        const priceA = a.price ?? Number.POSITIVE_INFINITY;
        const priceB = b.price ?? Number.POSITIVE_INFINITY;
        return priceA - priceB;
      }
      if (sort === 'reviews') {
        return b.reviewCount - a.reviewCount;
      }
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return b.reviewCount - a.reviewCount;
    });
  }

  /** Top dish categories by review volume for home “popular searches”. */
  async popularSearches(limit = 8): Promise<string[]> {
    const rows = await this.prisma.dish.groupBy({
      by: ['category'],
      where: {
        status: ApprovalStatus.APPROVED,
        visibility: ContentStatus.ACTIVE,
        restaurant: {
          status: ContentStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
          city: { isActive: true },
        },
      },
      _sum: { reviewCount: true },
      orderBy: { _sum: { reviewCount: 'desc' } },
      take: limit,
    });

    const fromDb = rows.map((r) => r.category).filter(Boolean);
    if (fromDb.length >= 4) return fromDb;

    const fallback = ['Biryani', 'Burger', 'Pizza', 'Karahi', 'Nihari', 'Broast'];
    return [...new Set([...fromDb, ...fallback])].slice(0, limit);
  }
}
