import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DishService } from './dish.service';
import { CreateDishDto } from './dish.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dishes')
export class DishController {
  constructor(private dishService: DishService) {}

  @Get('trending')
  getTrending(@Query('cityId') cityId?: string) {
    return this.dishService.getTrending(cityId);
  }

  @Get(':id/related')
  getRelated(@Param('id') id: string) {
    return this.dishService.getRelated(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dishService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateDishDto) {
    return this.dishService.create(dto);
  }
}
