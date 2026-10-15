import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class OwnerUpdateImageDto {
  /** Pass empty string to clear the image. */
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

export class OwnerUpdateRestaurantDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  address: string;

  @IsString()
  cityId: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

export class OwnerUpdateDishCategoryDto {
  @IsString()
  categoryId: string;
}

/** Optional fields applied when an owner approves a pending dish. */
export class OwnerApproveDishDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  price?: number | null;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsNumber()
  restaurantLat?: number;

  @IsOptional()
  @IsNumber()
  restaurantLng?: number;

  @IsOptional()
  @IsString()
  restaurantAddress?: string;

  @IsOptional()
  @IsString()
  restaurantCityId?: string;
}
