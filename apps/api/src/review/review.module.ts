import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { ReceiptOcrService } from './receipt-ocr.service';
import { DishModule } from '../dish/dish.module';

@Module({
  imports: [DishModule],
  controllers: [ReviewController],
  providers: [ReviewService, ReceiptOcrService],
})
export class ReviewModule {}
