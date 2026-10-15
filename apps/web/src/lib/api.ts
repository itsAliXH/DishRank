const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function apiUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/uploads/')) return `${API_URL}${path}`;
  return path;
}

/** Deduplicates identical in-flight GETs (e.g. React Strict Mode double mount). */
const inflightGets = new Map<string, Promise<unknown>>();

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

function dedupedGet<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Share one in-flight request for the same URL (avoids React Strict Mode double-fetch).
  if (!options.signal) {
    const existing = inflightGets.get(path);
    if (existing) return existing as Promise<T>;

    const promise = request<T>(path, options).finally(() => {
      inflightGets.delete(path);
    });
    inflightGets.set(path, promise);
    return promise;
  }
  return request<T>(path, options);
}

export const api = {
  search: (
    params: Record<string, string | number | null | undefined>,
    options?: RequestInit,
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const path = `/search?${qs}`;
    return dedupedGet<
      import('@dishrank/shared').Dish[] | import('@dishrank/shared').Restaurant[]
    >(path, options);
  },

  getDish: (id: string) =>
    request<import('@dishrank/shared').Dish & { reviews: import('@dishrank/shared').Review[] }>(
      `/dishes/${id}`,
    ),

  getRestaurant: (id: string) =>
    request<
      import('@dishrank/shared').Restaurant & { dishes: import('@dishrank/shared').Dish[] }
    >(`/restaurants/${id}`),

  getTrending: (cityId?: string) => {
    const qs = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
    return request<import('@dishrank/shared').Dish[]>(`/dishes/trending${qs}`);
  },

  getRelatedDishes: (id: string) =>
    request<import('@dishrank/shared').Dish[]>(`/dishes/${id}/related`),

  getPopularSearches: () => request<string[]>('/search/popular'),

  getMyReviews: () =>
    request<
      (import('@dishrank/shared').Review & {
        dish?: import('@dishrank/shared').Dish;
      })[]
    >('/reviews/me'),

  refreshToken: (refreshToken: string) =>
    request<import('@dishrank/shared').AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  uploadMedia: async (file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Upload failed');
    }
    return res.json() as Promise<{ url: string }>;
  },

  listCities: (q?: string) => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return request<import('@dishrank/shared').City[]>(`/cities${qs}`);
  },

  listAdminCities: () =>
    request<
      (import('@dishrank/shared').City & {
        isActive: boolean;
        _count?: { restaurants: number };
      })[]
    >('/admin/cities'),

  createAdminCity: (data: { name: string; province: string; isActive?: boolean }) =>
    request<
      import('@dishrank/shared').City & {
        isActive: boolean;
        _count?: { restaurants: number };
      }
    >('/admin/cities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAdminCity: (
    id: string,
    data: { name?: string; province?: string; isActive?: boolean },
  ) =>
    request<
      import('@dishrank/shared').City & {
        isActive: boolean;
        _count?: { restaurants: number };
      }
    >(`/admin/cities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  bulkUpdateAdminCities: (ids: string[], isActive: boolean) =>
    request<
      (import('@dishrank/shared').City & {
        isActive: boolean;
        _count?: { restaurants: number };
      })[]
    >('/admin/cities/bulk', {
      method: 'PATCH',
      body: JSON.stringify({ ids, isActive }),
    }),

  getBookmarks: () => request<import('@dishrank/shared').Dish[]>('/bookmarks'),

  getBookmarkIds: () => request<string[]>('/bookmarks/ids'),

  toggleBookmark: (dishId: string) =>
    request<{ saved: boolean; dishId: string }>('/bookmarks/toggle', {
      method: 'POST',
      body: JSON.stringify({ dishId }),
    }),

  saveBookmark: (dishId: string) =>
    request<{ saved: boolean; dishId: string }>(`/bookmarks/${dishId}`, {
      method: 'POST',
    }),

  unsaveBookmark: (dishId: string) =>
    request<{ saved: boolean; dishId: string }>(`/bookmarks/${dishId}`, {
      method: 'DELETE',
    }),

  login: (email: string, password: string) =>
    request<import('@dishrank/shared').AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, phone: string, password: string) =>
    request<import('@dishrank/shared').AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password }),
    }),

  updateProfile: (data: { name?: string; email?: string; phone?: string }) =>
    request<import('@dishrank/shared').User>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>('/auth/me/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  forgotPassword: (email: string) =>
    request<{ ok: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ ok: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),

  submitReview: (dishId: string, data: { rating: number; text?: string }) =>
    request<import('@dishrank/shared').Review>(`/dishes/${dishId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyReview: async (reviewId: string, data: FormData) => {
    const res = await fetch(`${API_URL}/reviews/${reviewId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: data,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      const message = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || 'Verification failed';
      throw new Error(message);
    }
    return res.json();
  },

  addDish: (data: {
    name: string;
    restaurantId: string;
    categoryId?: string;
    category?: string;
    price?: number;
  }) =>
    request<import('@dishrank/shared').Dish>('/dishes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  searchCategories: (q?: string) => {
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    return request<import('@dishrank/shared').Category[]>(`/categories${qs}`);
  },

  listAdminCategories: () =>
    request<
      (import('@dishrank/shared').Category & { _count?: { dishes: number } })[]
    >('/admin/categories'),

  createAdminCategory: (data: { name: string; isActive?: boolean }) =>
    request<import('@dishrank/shared').Category>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAdminCategory: (id: string, data: { name?: string; isActive?: boolean }) =>
    request<import('@dishrank/shared').Category>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateAdminDishCategory: (id: string, categoryId: string) =>
    request<import('@dishrank/shared').Dish>(`/admin/dishes/${id}/category`, {
      method: 'PATCH',
      body: JSON.stringify({ categoryId }),
    }),

  updateOwnerDishCategory: (id: string, categoryId: string) =>
    request<import('@dishrank/shared').Dish>(`/owner/dishes/${id}/category`, {
      method: 'PATCH',
      body: JSON.stringify({ categoryId }),
    }),

  getAdminPending: () =>
    request<{
      restaurants: (import('@dishrank/shared').Restaurant & {
        dishes?: import('@dishrank/shared').Dish[];
        _count?: { dishes: number };
      })[];
      dishes: import('@dishrank/shared').Dish[];
      reviews: import('@dishrank/shared').Review[];
    }>('/admin/pending'),

  getAdminStats: (params?: { province?: string; cityId?: string }) => {
    const sp = new URLSearchParams();
    if (params?.province) sp.set('province', params.province);
    if (params?.cityId) sp.set('cityId', params.cityId);
    const qs = sp.toString();
    return request<import('@dishrank/shared').AdminDashboardStats>(
      `/admin/stats${qs ? `?${qs}` : ''}`,
    );
  },

  listRestaurants: (cityId?: string) => {
    const qs = cityId ? `?cityId=${encodeURIComponent(cityId)}` : '';
    return request<
      (import('@dishrank/shared').Restaurant & {
        _count?: { dishes: number };
        dishes?: Pick<
          import('@dishrank/shared').Dish,
          'id' | 'name' | 'category' | 'imageUrl' | 'avgRating' | 'reviewCount' | 'price'
        >[];
      })[]
    >(`/restaurants${qs}`);
  },

  listRestaurantsPage: (params?: {
    cityId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.cityId) sp.set('cityId', params.cityId);
    if (params?.limit != null) sp.set('limit', String(params.limit));
    if (params?.offset != null) sp.set('offset', String(params.offset));
    const qs = sp.toString();
    return request<{
      items: (import('@dishrank/shared').Restaurant & {
        _count?: { dishes: number };
        dishes?: Pick<
          import('@dishrank/shared').Dish,
          'id' | 'name' | 'category' | 'imageUrl' | 'avgRating' | 'reviewCount' | 'price'
        >[];
      })[];
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    }>(`/restaurants${qs ? `?${qs}` : ''}`);
  },

  suggestRestaurants: (q?: string, cityId?: string) => {
    const sp = new URLSearchParams();
    if (q?.trim()) sp.set('q', q.trim());
    if (cityId) sp.set('cityId', cityId);
    const qs = sp.toString();
    return request<import('@dishrank/shared').Restaurant[]>(
      `/restaurants/suggest${qs ? `?${qs}` : ''}`,
    );
  },

  submitRestaurant: (data: {
    name: string;
    address: string;
    cityId: string;
    lat: number;
    lng: number;
    dishes?: { name: string; categoryId?: string; category?: string; price?: number }[];
  }) =>
    request<
      import('@dishrank/shared').Restaurant & { dishes: import('@dishrank/shared').Dish[] }
    >('/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOwnerPendingDishes: () =>
    request<import('@dishrank/shared').Dish[]>('/owner/pending-dishes'),

  getOwnerRestaurants: () =>
    request<
      (import('@dishrank/shared').Restaurant & {
        dishes: import('@dishrank/shared').Dish[];
      })[]
    >('/owner/restaurants'),

  ownerApproveDish: (
    id: string,
    data?: {
      name?: string;
      categoryId?: string;
      price?: number | null;
      imageUrl?: string | null;
      restaurantLat?: number;
      restaurantLng?: number;
      restaurantAddress?: string;
      restaurantCityId?: string;
    },
  ) =>
    request(`/owner/dishes/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  ownerRejectDish: (id: string) =>
    request(`/owner/dishes/${id}/reject`, { method: 'POST' }),

  ownerUpdateRestaurantImage: (id: string, imageUrl: string) =>
    request<
      import('@dishrank/shared').Restaurant & {
        dishes: import('@dishrank/shared').Dish[];
      }
    >(`/owner/restaurants/${id}/image`, {
      method: 'PATCH',
      body: JSON.stringify({ imageUrl }),
    }),

  ownerUpdateRestaurant: (
    id: string,
    data: {
      name: string;
      address: string;
      cityId: string;
      lat: number;
      lng: number;
      imageUrl?: string | null;
    },
  ) =>
    request<
      import('@dishrank/shared').Restaurant & {
        dishes: import('@dishrank/shared').Dish[];
      }
    >(`/owner/restaurants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  ownerUpdateDishImage: (id: string, imageUrl: string) =>
    request<import('@dishrank/shared').Dish>(`/owner/dishes/${id}/image`, {
      method: 'PATCH',
      body: JSON.stringify({ imageUrl }),
    }),

  listAdminRestaurants: () =>
    request<
      (import('@dishrank/shared').Restaurant & { _count?: { dishes: number } })[]
    >('/admin/restaurants'),

  listAdminPermissions: () =>
    request<
      (import('@dishrank/shared').Restaurant & {
        reviewsEnabled: boolean;
        receiptVerifyEnabled: boolean;
        allowGeneralReviews: boolean;
        requireOnSiteLocation: boolean;
        communityDishSubmitEnabled: boolean;
        _count?: { dishes: number };
        owner?: Pick<import('@dishrank/shared').User, 'id' | 'name' | 'email'> | null;
      })[]
    >('/admin/permissions'),

  updateAdminRestaurantPermissions: (
    id: string,
    data: Partial<import('@dishrank/shared').RestaurantPermissions>,
  ) =>
    request<
      import('@dishrank/shared').Restaurant & {
        reviewsEnabled: boolean;
        receiptVerifyEnabled: boolean;
        allowGeneralReviews: boolean;
        requireOnSiteLocation: boolean;
        communityDishSubmitEnabled: boolean;
        _count?: { dishes: number };
      }
    >(`/admin/restaurants/${id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getAdminCatalog: () =>
    request<
      (import('@dishrank/shared').Restaurant & {
        dishes: import('@dishrank/shared').Dish[];
      })[]
    >('/admin/catalog'),

  listAdminUsers: () =>
    request<
      (import('@dishrank/shared').User & {
        _count?: { reviews: number };
        ownedRestaurants?: { id: string; name: string }[];
      })[]
    >('/admin/users'),

  createAdminUser: (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role?: import('@dishrank/shared').UserRole;
    restaurantIds?: string[];
  }) =>
    request<
      import('@dishrank/shared').User & {
        ownedRestaurants?: { id: string; name: string }[];
      }
    >('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAdminUser: (
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      role?: import('@dishrank/shared').UserRole;
      restaurantIds?: string[];
    },
  ) =>
    request<
      import('@dishrank/shared').User & {
        ownedRestaurants?: { id: string; name: string }[];
      }
    >(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  setAdminUserPassword: (id: string, password: string) =>
    request<{ ok: boolean }>(`/admin/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    }),

  setAdminUserStatus: (id: string, status: import('@dishrank/shared').UserStatus) =>
    request<import('@dishrank/shared').User>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  assignRestaurantOwner: (restaurantId: string, userId: string | null) =>
    request(`/admin/restaurants/${restaurantId}/owner`, {
      method: 'PATCH',
      body: JSON.stringify({ userId }),
    }),

  createRestaurant: (data: {
    name: string;
    address: string;
    cityId: string;
    lat: number;
    lng: number;
    imageUrl?: string;
    dishes?: {
      name: string;
      categoryId?: string;
      category?: string;
      price?: number;
      imageUrl?: string;
    }[];
  }) =>
    request<
      import('@dishrank/shared').Restaurant & { dishes: import('@dishrank/shared').Dish[] }
    >('/admin/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAdminRestaurant: (
    id: string,
    data: {
      name: string;
      address: string;
      cityId: string;
      lat: number;
      lng: number;
      imageUrl?: string | null;
    },
  ) =>
    request<
      import('@dishrank/shared').Restaurant & {
        dishes: import('@dishrank/shared').Dish[];
        owner?: Pick<
          import('@dishrank/shared').User,
          'id' | 'name' | 'email' | 'role' | 'status'
        > | null;
      }
    >(`/admin/restaurants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  createRestaurantDish: (
    restaurantId: string,
    data: {
      name: string;
      categoryId?: string;
      category?: string;
      price?: number;
      imageUrl?: string;
    },
  ) =>
    request<import('@dishrank/shared').Dish>(`/admin/restaurants/${restaurantId}/dishes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  setRestaurantStatus: (id: string, status: import('@dishrank/shared').ContentStatus) =>
    request(`/admin/restaurants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateAdminRestaurantImage: (id: string, imageUrl: string) =>
    request<import('@dishrank/shared').Restaurant>(`/admin/restaurants/${id}/image`, {
      method: 'PATCH',
      body: JSON.stringify({ imageUrl }),
    }),

  updateAdminDishImage: (id: string, imageUrl: string) =>
    request<import('@dishrank/shared').Dish>(`/admin/dishes/${id}/image`, {
      method: 'PATCH',
      body: JSON.stringify({ imageUrl }),
    }),

  setDishVisibility: (id: string, status: import('@dishrank/shared').ContentStatus) =>
    request(`/admin/dishes/${id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteRestaurant: (id: string) =>
    request(`/admin/restaurants/${id}`, { method: 'DELETE' }),

  deleteDish: (id: string) =>
    request(`/admin/dishes/${id}`, { method: 'DELETE' }),

  approveRestaurant: (
    id: string,
    data?: {
      name?: string;
      address?: string;
      cityId?: string;
      lat?: number;
      lng?: number;
      imageUrl?: string | null;
    },
  ) =>
    request(`/admin/restaurants/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  rejectRestaurant: (id: string) =>
    request(`/admin/restaurants/${id}/reject`, { method: 'POST' }),

  approveDish: (
    id: string,
    data?: {
      name?: string;
      categoryId?: string;
      price?: number | null;
      imageUrl?: string | null;
      restaurantLat?: number;
      restaurantLng?: number;
      restaurantAddress?: string;
      restaurantCityId?: string;
    },
  ) =>
    request(`/admin/dishes/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  rejectDish: (id: string) =>
    request(`/admin/dishes/${id}/reject`, { method: 'POST' }),

  approveReview: (id: string) =>
    request(`/admin/reviews/${id}/approve`, { method: 'POST' }),

  rejectReview: (id: string) =>
    request(`/admin/reviews/${id}/reject`, { method: 'POST' }),

  listAdminReviews: (params?: {
    q?: string;
    status?: string;
    verified?: string;
    province?: string;
    cityId?: string;
    restaurantId?: string;
    dishId?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.status) sp.set('status', params.status);
    if (params?.verified) sp.set('verified', params.verified);
    if (params?.province) sp.set('province', params.province);
    if (params?.cityId) sp.set('cityId', params.cityId);
    if (params?.restaurantId) sp.set('restaurantId', params.restaurantId);
    if (params?.dishId) sp.set('dishId', params.dishId);
    const qs = sp.toString();
    return request<
      (import('@dishrank/shared').Review & {
        user?: { id: string; name: string; email?: string };
        dish?: import('@dishrank/shared').Dish & {
          restaurant?: import('@dishrank/shared').Restaurant;
        };
        verification?: import('@dishrank/shared').Verification | null;
      })[]
    >(`/admin/reviews${qs ? `?${qs}` : ''}`);
  },

  hideAdminReview: (id: string) =>
    request(`/admin/reviews/${id}/hide`, { method: 'POST' }),

  restoreAdminReview: (id: string) =>
    request(`/admin/reviews/${id}/restore`, { method: 'POST' }),

  unverifyAdminReview: (id: string) =>
    request(`/admin/reviews/${id}/unverify`, { method: 'POST' }),
};
