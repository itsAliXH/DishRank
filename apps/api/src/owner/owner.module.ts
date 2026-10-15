import { Module } from '@nestjs/common';
import { OwnerController } from './owner.controller';
import { OwnerService } from './owner.service';
import { AuthModule } from '../auth/auth.module';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [AuthModule, CategoryModule],
  controllers: [OwnerController],
  providers: [OwnerService],
})
export class OwnerModule {}
