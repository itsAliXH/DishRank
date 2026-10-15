import { Controller, Get, Query } from '@nestjs/common';
import { CityService } from './city.service';

@Controller('cities')
export class CityController {
  constructor(private cityService: CityService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.cityService.list(q);
  }
}
