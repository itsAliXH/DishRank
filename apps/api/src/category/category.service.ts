import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Public autocomplete — ranks strong matches first, then related categories
   * that share the typed first letter (e.g. "be" → Beef, then Biryani / BBQ).
   */
  async search(q?: string, limit = 20) {
    const query = q?.trim() || '';
    if (!query) {
      return this.prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        take: limit,
      });
    }

    const first = query[0] ?? '';
    // Short queries: prefix + same first letter only (avoids noisy trigram hits).
    // Longer queries: also substring + fuzzy (typos like "beryani").
    const allowFuzzy = query.length >= 3;

    const rows = await this.prisma.$queryRaw<
      { id: string; name: string; isActive: boolean; createdAt: Date }[]
    >`
      SELECT c.id, c.name, c."isActive", c."createdAt"
      FROM "Category" c
      WHERE c."isActive" = true
        AND (
          lower(c.name) LIKE lower(${query}) || '%'
          OR lower(left(c.name, 1)) = lower(${first})
          OR (
            ${allowFuzzy}
            AND (
              c.name ILIKE '%' || ${query} || '%'
              OR lower(c.name) % lower(${query})
              OR word_similarity(lower(${query}), lower(c.name)) >= 0.28
            )
          )
        )
      ORDER BY
        CASE
          WHEN lower(c.name) = lower(${query}) THEN 0
          WHEN lower(c.name) LIKE lower(${query}) || '%' THEN 1
          WHEN lower(c.name) LIKE '%' || lower(${query}) || '%' THEN 2
          WHEN ${allowFuzzy} AND GREATEST(
            similarity(lower(c.name), lower(${query})),
            word_similarity(lower(${query}), lower(c.name))
          ) >= 0.35 THEN 3
          WHEN lower(left(c.name, 1)) = lower(${first}) THEN 4
          ELSE 5
        END ASC,
        GREATEST(
          similarity(lower(c.name), lower(${query})),
          word_similarity(lower(${query}), lower(c.name))
        ) DESC,
        c.name ASC
      LIMIT ${limit}
    `;
    return rows;
  }

  listAll() {
    return this.prisma.category.findMany({
      include: { _count: { select: { dishes: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim().replace(/\s+/g, ' ');
    if (name.length < 2) throw new BadRequestException('Category name is too short');

    const existing = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('A category with this name already exists');

    return this.prisma.category.create({
      data: { name, isActive: dto.isActive ?? true },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    const data: { name?: string; isActive?: boolean } = {};
    if (dto.name != null) {
      const name = dto.name.trim().replace(/\s+/g, ' ');
      const clash = await this.prisma.category.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
        },
      });
      if (clash) throw new ConflictException('A category with this name already exists');
      data.name = name;
    }
    if (dto.isActive != null) data.isActive = dto.isActive;

    const updated = await this.prisma.category.update({
      where: { id },
      data,
    });

    // Keep denormalized dish.category in sync when renamed
    if (data.name) {
      await this.prisma.dish.updateMany({
        where: { categoryId: id },
        data: { category: data.name },
      });
    }

    return updated;
  }

  /** Resolve categoryId from id or exact name; never invents new rows for public submit. */
  async resolveId(categoryId?: string, categoryName?: string): Promise<{ id: string; name: string }> {
    if (categoryId) {
      const byId = await this.prisma.category.findFirst({
        where: { id: categoryId, isActive: true },
      });
      if (byId) return byId;
    }
    if (categoryName?.trim()) {
      const byName = await this.prisma.category.findFirst({
        where: {
          name: { equals: categoryName.trim(), mode: 'insensitive' },
          isActive: true,
        },
      });
      if (byName) return byName;
    }
    throw new BadRequestException(
      'Pick a category from the list. Ask an admin if yours is missing.',
    );
  }
}
