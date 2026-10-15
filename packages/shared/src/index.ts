export enum UserRole {
  USER = 'USER',
  RESTAURANT_OWNER = 'RESTAURANT_OWNER',
  ADMIN = 'ADMIN',
}

export type UserStatus = 'ACTIVE' | 'DEACTIVATED' | 'BANNED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ContentStatus = 'ACTIVE' | 'HIDDEN' | 'BLOCKED';

/** Suggested dish categories (kept for UI defaults; DB Category table is source of truth). */
export const DISH_CATEGORIES = [
  'Biryani',
  'Pulao',
  'Karahi',
  'Nihari',
  'Haleem',
  'BBQ / Seekh Kabab',
  'Mutton',
  'Chicken',
  'Beef',
  'Fish / Seafood',
  'Burger',
  'Pizza',
  'Pasta',
  'Sandwich / Shawarma',
  'Chinese',
  'Thai',
  'Dessert',
  'Paratha / Breakfast',
  'Drinks',
] as const;

export interface Category {
  id: string;
  name: string;
  isActive?: boolean;
  _count?: { dishes: number };
}

export interface City {
  id: string;
  name: string;
  province: string;
  /** False = hidden from pickers and public search. Admin only when inactive. */
  isActive?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  cityId?: string;
  city?: City;
  lat: number;
  lng: number;
  imageUrl?: string | null;
  /** Admin-assigned restaurant contact only — never the community submitter. */
  claimedBy?: string | null;
  status?: ContentStatus;
  approvalStatus?: ApprovalStatus;
  owner?: Pick<User, 'id' | 'name' | 'email' | 'role' | 'status'> | null;
  /** When false, diners cannot rate / review dishes at this restaurant. */
  reviewsEnabled?: boolean;
  /**
   * When reviews are on: true = Verified mode (receipt path available);
   * false = General-only mode (no receipt / Verified badge).
   */
  receiptVerifyEnabled?: boolean;
  /**
   * Verified mode only: true = allow General and Verified; false = Verified only
   * (rating without a receipt is blocked).
   */
  allowGeneralReviews?: boolean;
  /**
   * Verified mode: true = receipt verify requires GPS within ~1 km;
   * false = receipt can be uploaded from anywhere.
   */
  requireOnSiteLocation?: boolean;
  /** @deprecated Unused — kept for DB compat. */
  receiptRequired?: boolean;
  /** When false, community cannot suggest dishes for this restaurant. */
  communityDishSubmitEnabled?: boolean;
}

/** Extensible restaurant feature flags (admin Permissions tab). */
export interface RestaurantPermissions {
  reviewsEnabled: boolean;
  /** True = Verified mode; false = General-only (when reviewsEnabled). */
  receiptVerifyEnabled: boolean;
  /** Verified mode: allow General too, or Verified-only. */
  allowGeneralReviews: boolean;
  /** Verified mode: require on-site GPS, or allow from anywhere. */
  requireOnSiteLocation: boolean;
  communityDishSubmitEnabled: boolean;
}

/** Content-status breakdown (Active / Inactive=HIDDEN / Banned=BLOCKED). */
export interface ContentStatusCounts {
  total: number;
  active: number;
  inactive: number;
  banned: number;
}

/** Admin Overview dashboard aggregates (optional province / city scope). */
export interface AdminDashboardStats {
  scope: {
    country: string;
    province: string | null;
    cityId: string | null;
    cityName: string | null;
  };
  restaurants: ContentStatusCounts & {
    pendingApproval: number;
    rejected: number;
    withOwner: number;
    withoutOwner: number;
    receiptVerifyOn: number;
    receiptVerifyOff: number;
  };
  dishes: ContentStatusCounts & {
    pendingApproval: number;
    rejected: number;
  };
  reviews: {
    total: number;
    verified: number;
    unverified: number;
    pendingApproval: number;
    hidden: number;
  };
  cities: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
    active: number;
    deactivated: number;
    banned: number;
    owners: number;
  };
  inbox: {
    restaurants: number;
    dishes: number;
    reviews: number;
    total: number;
  };
}

export interface Dish {
  id: string;
  name: string;
  restaurantId: string;
  categoryId?: string;
  /** Display name — kept in sync with Category.name */
  category: string;
  price?: number;
  avgRating: number;
  reviewCount: number;
  imageUrl?: string;
  restaurant?: Restaurant;
  visibility?: ContentStatus;
  status?: string;
}

export interface Review {
  id: string;
  userId: string;
  dishId: string;
  rating: number;
  text?: string;
  photos: string[];
  verified: boolean;
  /** APPROVED = public; REJECTED = soft-hidden by admin; PENDING = awaiting moderation */
  status?: ApprovalStatus;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  dish?: Dish;
}

/** Admin-facing OCR + dish-match summary stored on Verification.matchReport. */
export interface ReceiptMatchReport {
  dishName: string;
  restaurantName: string;
  dishMatched: boolean;
  matchScore: number;
  matchedTokens: string[];
  missingTokens: string[];
  restaurantMentioned: boolean;
  ocrConfidence: number | null;
  summary: string;
  ocrPreview: string;
}

export interface Verification {
  id: string;
  reviewId: string;
  receiptImageUrl: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
  capturedAt: string;
  /** PENDING | DONE | FAILED */
  ocrStatus?: string;
  ocrText?: string | null;
  ocrConfidence?: number | null;
  dishMatched?: boolean | null;
  matchScore?: number | null;
  matchReport?: ReceiptMatchReport | null;
  ocrProcessedAt?: string | null;
}

export interface Bookmark {
  id: string;
  userId: string;
  dishId: string;
}

export interface SearchParams {
  q?: string;
  type?: 'dish' | 'restaurant';
  lat?: number;
  lng?: number;
  radius?: number;
  minRating?: number;
  sort?: 'rating' | 'distance' | 'reviews';
  cityId?: string;
  category?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
