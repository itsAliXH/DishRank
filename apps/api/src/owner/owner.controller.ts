import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OwnerService } from './owner.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OwnerApproveDishDto, OwnerUpdateDishCategoryDto, OwnerUpdateImageDto, OwnerUpdateRestaurantDto } from './owner.dto';

@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RESTAURANT_OWNER', 'ADMIN')
export class OwnerController {
  constructor(private ownerService: OwnerService) {}

  @Get('pending-dishes')
  getPending(@Req() req: { user: { id: string } }) {
    return this.ownerService.getPendingDishes(req.user.id);
  }

  @Get('restaurants')
  listRestaurants(@Req() req: { user: { id: string } }) {
    return this.ownerService.listOwnedRestaurants(req.user.id);
  }

  @Patch('restaurants/:id')
  updateRestaurant(
    @Param('id') id: string,
    @Body() dto: OwnerUpdateRestaurantDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.ownerService.updateRestaurant(req.user.id, id, dto);
  }

  @Patch('restaurants/:id/image')
  updateRestaurantImage(
    @Param('id') id: string,
    @Body() dto: OwnerUpdateImageDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.ownerService.updateRestaurantImage(req.user.id, id, dto);
  }

  @Patch('dishes/:id/image')
  updateDishImage(
    @Param('id') id: string,
    @Body() dto: OwnerUpdateImageDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.ownerService.updateDishImage(req.user.id, id, dto);
  }

  @Patch('dishes/:id/category')
  updateDishCategory(
    @Param('id') id: string,
    @Body() dto: OwnerUpdateDishCategoryDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.ownerService.updateDishCategory(req.user.id, id, dto);
  }

  @Post('dishes/:id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: OwnerApproveDishDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.ownerService.approveDish(req.user.id, id, dto || {});
  }

  @Post('dishes/:id/reject')
  reject(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.ownerService.rejectDish(req.user.id, id);
  }
}
