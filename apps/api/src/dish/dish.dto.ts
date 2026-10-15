import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDishDto {
  @IsString()
  name: string;

  @IsString()
  restaurantId: string;

  /** Prefer canonical category id from autocomplete. */
  @IsOptional()
  @IsString()
  categoryId?: string;

  /** Legacy / fallback: resolved to an existing Category by name. */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}
