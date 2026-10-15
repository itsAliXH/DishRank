import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CityService {
  constructor(private prisma: PrismaService) {}

  /** Public portal list — enabled cities only. */
  list(q?: string) {
    return this.prisma.city.findMany({
      where: {
        isActive: true,
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.city.findUnique({ where: { id } });
  }

  findActiveById(id: string) {
    return this.prisma.city.findFirst({ where: { id, isActive: true } });
  }
}
