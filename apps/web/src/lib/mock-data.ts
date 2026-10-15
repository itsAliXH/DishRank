import type { Dish, Restaurant, Review, User } from '@dishrank/shared';

export const mockRestaurants: Restaurant[] = [
  {
    id: 'r1',
    name: 'Student Biryani',
    address: '123 Main St, Downtown',
    lat: 24.8607,
    lng: 67.0011,
  },
  {
    id: 'r2',
    name: 'XYZ Dhaba',
    address: '45 Food Lane, Gulshan',
    lat: 24.87,
    lng: 67.01,
  },
  {
    id: 'r3',
    name: 'KFC',
    address: 'Clifton Block 5',
    lat: 24.8138,
    lng: 67.0298,
  },
  {
    id: 'r4',
    name: 'Pizza Palace',
    address: '88 Marina Road',
    lat: 24.805,
    lng: 67.035,
  },
];

export const mockDishes: Dish[] = [
  {
    id: 'd1',
    name: 'Chicken Biryani',
    restaurantId: 'r1',
    category: 'Biryani',
    price: 450,
    avgRating: 4.5,
    reviewCount: 320,
    imageUrl:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
    restaurant: mockRestaurants[0],
  },
  {
    id: 'd2',
    name: 'Beef Biryani',
    restaurantId: 'r2',
    category: 'Biryani',
    price: 500,
    avgRating: 4.2,
    reviewCount: 190,
    imageUrl:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
    restaurant: mockRestaurants[1],
  },
  {
    id: 'd3',
    name: 'Zinger Burger',
    restaurantId: 'r3',
    category: 'Burger',
    price: 650,
    avgRating: 4.6,
    reviewCount: 540,
    imageUrl:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    restaurant: mockRestaurants[2],
  },
  {
    id: 'd4',
    name: 'Pepperoni Pizza',
    restaurantId: 'r4',
    category: 'Pizza',
    price: 1200,
    avgRating: 3.8,
    reviewCount: 87,
    imageUrl:
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop',
    restaurant: mockRestaurants[3],
  },
  {
    id: 'd5',
    name: 'Mutton Biryani',
    restaurantId: 'r1',
    category: 'Biryani',
    price: 550,
    avgRating: 4.7,
    reviewCount: 210,
    imageUrl:
      'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
    restaurant: mockRestaurants[0],
  },
];

export const mockReviews: Review[] = [
  {
    id: 'rev1',
    userId: 'u1',
    dishId: 'd1',
    rating: 5,
    text: 'Best biryani in town! Perfectly spiced and generous portions.',
    photos: [],
    verified: true,
    createdAt: '2026-05-01T10:00:00Z',
    user: { id: 'u1', name: 'Ahmed K.' },
  },
  {
    id: 'rev2',
    userId: 'u2',
    dishId: 'd1',
    rating: 4,
    text: 'Really good but a bit oily. Still worth it.',
    photos: [],
    verified: false,
    createdAt: '2026-05-10T14:30:00Z',
    user: { id: 'u2', name: 'Sara M.' },
  },
  {
    id: 'rev3',
    userId: 'u3',
    dishId: 'd3',
    rating: 5,
    text: 'Crispy, juicy, perfect every time. My go-to burger.',
    photos: [],
    verified: true,
    createdAt: '2026-05-15T18:00:00Z',
    user: { id: 'u3', name: 'Ali R.' },
  },
];

export const mockUser: User = {
  id: 'u1',
  name: 'Demo User',
  email: 'demo@dishrank.com',
  role: 'USER' as User['role'],
  createdAt: '2026-01-01T00:00:00Z',
};

export const trendingDishes = mockDishes.slice(0, 5);

export const popularSearches = ['Biryani', 'Zinger Burger', 'Pepperoni Pizza', 'Pizza', 'Burger'];

export function getDishById(id: string) {
  return mockDishes.find((d) => d.id === id);
}

export function getRestaurantById(id: string) {
  return mockRestaurants.find((r) => r.id === id);
}

export function getReviewsForDish(dishId: string) {
  return mockReviews.filter((r) => r.dishId === dishId);
}

export function searchDishes(
  query: string,
  options?: { minRating?: number; sort?: string; lat?: number; lng?: number },
) {
  let results = mockDishes.filter(
    (d) =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.category.toLowerCase().includes(query.toLowerCase()),
  );

  if (options?.minRating) {
    results = results.filter((d) => d.avgRating >= options.minRating!);
  }

  const sort = options?.sort || 'rating';

  if (sort === 'distance' && options?.lat != null && options?.lng != null) {
    results = results
      .map((d) => ({ dish: d, dist: getDistanceKm(options.lat!, options.lng!, d) }))
      .filter((x) => x.dist !== null && x.dist <= 5)
      .sort((a, b) => a.dist! - b.dist!)
      .map((x) => x.dish);
  } else if (sort === 'price') {
    results.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  } else if (sort === 'reviews') {
    results.sort((a, b) => b.reviewCount - a.reviewCount);
  } else {
    results.sort((a, b) => {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return b.reviewCount - a.reviewCount;
    });
  }

  return results;
}

export function searchRestaurants(query: string) {
  return mockRestaurants.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()),
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getDistanceKm(
  lat: number,
  lng: number,
  dish: Dish,
): number | null {
  if (!dish.restaurant) return null;
  return haversine(lat, lng, dish.restaurant.lat, dish.restaurant.lng);
}
