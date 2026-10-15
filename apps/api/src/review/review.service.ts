import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DishService } from '../dish/dish.service';
import { CreateReviewDto } from './review.dto';
import { ReceiptOcrService } from './receipt-ocr.service';
import { haversineKm } from '../utils/geo';
import * as path from 'path';
import * as fs from 'fs';

/** Max distance from restaurant GPS to accept a verified visit (km). */
const VERIFY_MAX_KM = 1;

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private dishService: DishService,
    private receiptOcr: ReceiptOcrService,
  ) {}

  async listMine(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: {
        user: { select: { id: true, name: true } },
        dish: {
          include: { restaurant: { include: { city: true } } },
        },
        verification: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dishId: string, userId: string, dto: CreateReviewDto) {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      include: { restaurant: true },
    });
    if (!dish) throw new NotFoundException('Dish not found');

    const restaurant = dish.restaurant;
    if (!restaurant.reviewsEnabled) {
      throw new BadRequestException('Reviews are disabled for this restaurant');
    }

    const verifiedMode = restaurant.receiptVerifyEnabled;
    const allowGeneral = restaurant.allowGeneralReviews !== false;
    const verifiedOnly = verifiedMode && !allowGeneral;

    const review = await this.prisma.review.create({
      data: {
        userId,
        dishId,
        rating: dto.rating,
        text: dto.text,
        photos: dto.photos || [],
        verified: false,
        status: verifiedOnly ? ApprovalStatus.PENDING : ApprovalStatus.APPROVED,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!verifiedOnly) {
      await this.dishService.updateRatingStats(dishId);
    }
    return review;
  }

  async verify(
    reviewId: string,
    userId: string,
    file: Express.Multer.File,
    gpsLat: number | null,
    gpsLng: number | null,
  ) {
    if (!file) throw new BadRequestException('Receipt image is required');

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        dish: { include: { restaurant: true } },
        verification: true,
      },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only verify your own reviews');
    }
    if (review.verification) {
      throw new BadRequestException('A receipt was already submitted for this review');
    }
    if (review.verified) {
      throw new BadRequestException('This review is already verified');
    }

    const restaurant = review.dish.restaurant;
    if (!restaurant.reviewsEnabled) {
      throw new BadRequestException('Reviews are disabled for this restaurant');
    }
    if (!restaurant.receiptVerifyEnabled) {
      throw new BadRequestException(
        'Verified reviews are not enabled for this restaurant. Contact DishRank if you believe this is a mistake.',
      );
    }

    const requireOnSite = restaurant.requireOnSiteLocation !== false;
    let storedLat: number | null = null;
    let storedLng: number | null = null;

    if (requireOnSite) {
      if (!Number.isFinite(gpsLat) || !Number.isFinite(gpsLng)) {
        throw new BadRequestException(
          'Location is required — you must be near the restaurant to verify',
        );
      }
      const distanceKm = haversineKm(gpsLat!, gpsLng!, restaurant.lat, restaurant.lng);
      if (distanceKm > VERIFY_MAX_KM) {
        throw new BadRequestException(
          `You must be within ${VERIFY_MAX_KM} km of the restaurant to verify (you are ~${distanceKm.toFixed(1)} km away)`,
        );
      }
      storedLat = gpsLat;
      storedLng = gpsLng;
    } else if (Number.isFinite(gpsLat) && Number.isFinite(gpsLng)) {
      storedLat = gpsLat;
      storedLng = gpsLng;
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `${reviewId}-${Date.now()}${path.extname(file.originalname) || '.jpg'}`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    const verification = await this.prisma.verification.create({
      data: {
        reviewId,
        receiptImageUrl: `/uploads/${filename}`,
        gpsLat: storedLat,
        gpsLng: storedLng,
        ocrStatus: 'PENDING',
      },
    });

    // Extract text and check whether the rated dish appears on the receipt.
    const ocr = await this.receiptOcr.analyzeReceipt({
      imagePath: filepath,
      dishName: review.dish.name,
      restaurantName: restaurant.name,
    });

    await this.prisma.verification.update({
      where: { id: verification.id },
      data: {
        ocrStatus: ocr.ocrStatus,
        ocrText: ocr.ocrText,
        ocrConfidence: ocr.ocrConfidence,
        dishMatched: ocr.dishMatched,
        matchScore: ocr.matchScore,
        matchReport: ocr.matchReport ?? undefined,
        ocrProcessedAt: new Date(),
      },
    });

    // Receipt + rating → Verified candidate; stays private until an admin approves.
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        verified: false,
        status: ApprovalStatus.PENDING,
      },
      include: {
        user: { select: { id: true, name: true } },
        verification: true,
        dish: { include: { restaurant: true } },
      },
    });

    await this.dishService.updateRatingStats(review.dishId);
    return updated;
  }
}
