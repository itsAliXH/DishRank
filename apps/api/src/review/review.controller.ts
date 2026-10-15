import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Get('reviews/me')
  @UseGuards(JwtAuthGuard)
  listMine(@Request() req: { user: { id: string } }) {
    return this.reviewService.listMine(req.user.id);
  }

  @Post('dishes/:id/reviews')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('id') dishId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.create(dishId, req.user.id, dto);
  }

  @Post('reviews/:id/verify')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('receipt'))
  verify(
    @Param('id') reviewId: string,
    @Request() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
    @Body('gpsLat') gpsLat?: string,
    @Body('gpsLng') gpsLng?: string,
  ) {
    const lat = gpsLat != null && gpsLat !== '' ? parseFloat(gpsLat) : NaN;
    const lng = gpsLng != null && gpsLng !== '' ? parseFloat(gpsLng) : NaN;
    return this.reviewService.verify(
      reviewId,
      req.user.id,
      file,
      Number.isFinite(lat) ? lat : null,
      Number.isFinite(lng) ? lng : null,
    );
  }
}
