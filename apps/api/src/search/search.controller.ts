import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('popular')
  popular() {
    return this.searchService.popularSearches();
  }

  @Get()
  search(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('minRating') minRating?: string,
    @Query('sort') sort?: string,
    @Query('cityId') cityId?: string,
    @Query('category') category?: string,
  ) {
    return this.searchService.search({
      q,
      type,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius: radius ? parseFloat(radius) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      sort,
      cityId,
      category,
    });
  }
}
