import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { DishModule } from './dish/dish.module';
import { ReviewModule } from './review/review.module';
import { SearchModule } from './search/search.module';
import { AdminModule } from './admin/admin.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { CityModule } from './city/city.module';
import { OwnerModule } from './owner/owner.module';
import { MediaModule } from './media/media.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    AuthModule,
    RestaurantModule,
    DishModule,
    ReviewModule,
    SearchModule,
    AdminModule,
    BookmarkModule,
    CityModule,
    OwnerModule,
    MediaModule,
    CategoryModule,
  ],
})
export class AppModule {}
