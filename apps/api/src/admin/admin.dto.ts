import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ContentStatus, UserRole, UserStatus } from '@prisma/client';

export class AdminCreateDishItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class AdminCreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  cityId: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminCreateDishItemDto)
  dishes?: AdminCreateDishItemDto[];
}

export class AdminCreateDishDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateContentStatusDto {
  @IsEnum(ContentStatus)
  status: ContentStatus;
}

export class AdminUpdateRestaurantImageDto {
  /** Pass empty string to clear the image. */
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

export class AdminUpdateRestaurantDto {
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

export class AdminUpdateDishImageDto {
  /** Pass empty string to clear the image. */
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

export class AdminUpdateDishCategoryDto {
  @IsString()
  categoryId: string;
}

/** Optional fields applied when approving a pending dish. */
export class AdminApproveDishDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
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

/** Optional fields applied when approving a pending restaurant. */
export class AdminApproveRestaurantDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  address?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /** Restaurants this user owns (RESTAURANT_OWNER). Empty clears all. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restaurantIds?: string[];
}

export class AdminSetPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;
}

export class AdminSetUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class AdminCreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restaurantIds?: string[];
}

export class AdminAssignOwnerDto {
  /** Pass null / omit to unassign owner. Restaurant listing stays public either way. */
  @IsOptional()
  @IsString()
  userId?: string | null;
}

export class AdminUpdateRestaurantPermissionsDto {
  @IsOptional()
  @IsBoolean()
  reviewsEnabled?: boolean;

  /** Verified mode vs General-only (when reviews are on). */
  @IsOptional()
  @IsBoolean()
  receiptVerifyEnabled?: boolean;

  /** Verified mode: allow General + Verified, or Verified only. */
  @IsOptional()
  @IsBoolean()
  allowGeneralReviews?: boolean;

  /** Verified mode: require on-site GPS (~1 km), or allow from anywhere. */
  @IsOptional()
  @IsBoolean()
  requireOnSiteLocation?: boolean;

  @IsOptional()
  @IsBoolean()
  communityDishSubmitEnabled?: boolean;
}

export class AdminCreateCityDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  province: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUpdateCityDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  province?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminBulkUpdateCitiesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];

  @IsBoolean()
  isActive: boolean;
}
