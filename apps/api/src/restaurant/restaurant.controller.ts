import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { UserCreateRestaurantDto } from './restaurant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('restaurants')
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  @Get()
  list(
    @Query('cityId') cityId?: string,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ) {
    const limit =
      limitRaw != null && limitRaw !== '' ? Number.parseInt(limitRaw, 10) : undefined;
    const offset =
      offsetRaw != null && offsetRaw !== '' ? Number.parseInt(offsetRaw, 10) : 0;
    return this.restaurantService.listPublic(
      cityId,
      Number.isFinite(limit) ? limit : undefined,
      Number.isFinite(offset) ? offset : 0,
    );
  }

  /** Autocomplete for restaurant names (must stay above :id). */
  @Get('suggest')
  suggest(@Query('q') q?: string, @Query('cityId') cityId?: string) {
    return this.restaurantService.suggest(q, cityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  submit(
    @Body() dto: UserCreateRestaurantDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.restaurantService.submit(dto, req.user.id);
  }
}
