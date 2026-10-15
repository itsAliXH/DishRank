import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient, UserRole, ApprovalStatus, ContentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_CITY_IDS = ['city-karachi', 'city-lahore', 'city-islamabad'] as const;

async function main() {
  const password = await bcrypt.hash('password123', 10);

  // Enable a few major cities so pickers/search work out of the box
  await prisma.city.updateMany({
    where: { id: { in: [...DEMO_CITY_IDS] } },
    data: { isActive: true },
  });

  // Canonical categories (idempotent)
  const categoryNames = [
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
  ];
  const categoryByName = new Map<string, string>();
  for (const name of categoryNames) {
    const row = await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    categoryByName.set(name, row.id);
  }

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dishrank.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@dishrank.com',
      password,
      role: UserRole.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@dishrank.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@dishrank.com',
      password,
      role: UserRole.USER,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@dishrank.com' },
    update: {
      role: UserRole.RESTAURANT_OWNER,
      password,
    },
    create: {
      name: 'Restaurant Owner',
      email: 'owner@dishrank.com',
      password,
      role: UserRole.RESTAURANT_OWNER,
    },
  });

  const restaurants = await Promise.all([
    prisma.restaurant.upsert({
      where: { id: 'seed-r1' },
      update: {
        cityId: 'city-karachi',
        claimedBy: owner.id,
        approvalStatus: ApprovalStatus.APPROVED,
        status: ContentStatus.ACTIVE,
      },
      create: {
        id: 'seed-r1',
        name: 'Student Biryani',
        address: '123 Main St, Downtown',
        cityId: 'city-karachi',
        lat: 24.8607,
        lng: 67.0011,
        claimedBy: owner.id,
        approvalStatus: ApprovalStatus.APPROVED,
        status: ContentStatus.ACTIVE,
      },
    }),
    prisma.restaurant.upsert({
      where: { id: 'seed-r2' },
      update: {
        cityId: 'city-karachi',
        approvalStatus: ApprovalStatus.APPROVED,
        status: ContentStatus.ACTIVE,
      },
      create: {
        id: 'seed-r2',
        name: 'XYZ Dhaba',
        address: '45 Food Lane, Gulshan',
        cityId: 'city-karachi',
        lat: 24.87,
        lng: 67.01,
        approvalStatus: ApprovalStatus.APPROVED,
        status: ContentStatus.ACTIVE,
      },
    }),
    prisma.restaurant.upsert({
      where: { id: 'seed-r3' },
      update: {
        cityId: 'city-karachi',
        approvalStatus: ApprovalStatus.APPROVED,
        status: ContentStatus.ACTIVE,
      },
      create: {
        id: 'seed-r3',
        name: 'KFC',
        address: 'Clifton Block 5',
        cityId: 'city-karachi',
        lat: 24.8138,
        lng: 67.0298,
        approvalStatus: ApprovalStatus.APPROVED,
        status: ContentStatus.ACTIVE,
      },
    }),
    prisma.restaurant.upsert({
      where: { id: 'seed-r4' },
      update: {
        cityId: 'city-karachi',
        approvalStatus: ApprovalStatus.APPROVED,
        status: ContentStatus.ACTIVE,
      },
      create: {
        id: 'seed-r4',
        name: 'Pizza Palace',
        address: '88 Marina Road',
        cityId: 'city-karachi',
        lat: 24.805,
        lng: 67.035,
        approvalStatus: ApprovalStatus.APPROVED,
        status: ContentStatus.ACTIVE,
      },
    }),
  ]);

  const dishDefs = [
    {
      name: 'Chicken Biryani',
      restaurantId: restaurants[0].id,
      category: 'Biryani',
      price: 450,
      avgRating: 4.5,
      reviewCount: 320,
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
    },
    {
      name: 'Beef Biryani',
      restaurantId: restaurants[1].id,
      category: 'Biryani',
      price: 500,
      avgRating: 4.2,
      reviewCount: 190,
      imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
    },
    {
      name: 'Zinger Burger',
      restaurantId: restaurants[2].id,
      category: 'Burger',
      price: 650,
      avgRating: 4.6,
      reviewCount: 540,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    },
    {
      name: 'Pepperoni Pizza',
      restaurantId: restaurants[3].id,
      category: 'Pizza',
      price: 1200,
      avgRating: 3.8,
      reviewCount: 87,
      imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop',
    },
    {
      name: 'Mutton Biryani',
      restaurantId: restaurants[0].id,
      category: 'Biryani',
      price: 550,
      avgRating: 4.7,
      reviewCount: 210,
      imageUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
    },
  ];

  for (const dish of dishDefs) {
    const categoryId = categoryByName.get(dish.category);
    if (!categoryId) throw new Error(`Missing seeded category: ${dish.category}`);

    const existing = await prisma.dish.findFirst({
      where: { name: dish.name, restaurantId: dish.restaurantId },
    });
    if (existing) {
      await prisma.dish.update({
        where: { id: existing.id },
        data: {
          categoryId,
          category: dish.category,
          price: dish.price,
          avgRating: dish.avgRating,
          reviewCount: dish.reviewCount,
          imageUrl: dish.imageUrl,
          status: ApprovalStatus.APPROVED,
          visibility: ContentStatus.ACTIVE,
        },
      });
    } else {
      await prisma.dish.create({
        data: {
          name: dish.name,
          restaurantId: dish.restaurantId,
          categoryId,
          category: dish.category,
          price: dish.price,
          avgRating: dish.avgRating,
          reviewCount: dish.reviewCount,
          imageUrl: dish.imageUrl,
          status: ApprovalStatus.APPROVED,
          visibility: ContentStatus.ACTIVE,
        },
      });
    }
  }

  const chickenBiryani = await prisma.dish.findFirst({
    where: { name: 'Chicken Biryani', restaurantId: restaurants[0].id },
  });
  const zingerBurger = await prisma.dish.findFirst({
    where: { name: 'Zinger Burger', restaurantId: restaurants[2].id },
  });

  if (chickenBiryani) {
    const existingCount = await prisma.review.count({
      where: { dishId: chickenBiryani.id, userId: user.id },
    });
    if (existingCount === 0) {
      await prisma.review.createMany({
        data: [
          {
            userId: user.id,
            dishId: chickenBiryani.id,
            rating: 5,
            text: 'Best biryani in town! Perfectly spiced and generous portions.',
            photos: [],
            verified: true,
            status: ApprovalStatus.APPROVED,
          },
          {
            userId: admin.id,
            dishId: chickenBiryani.id,
            rating: 4,
            text: 'Really good but a bit oily. Still worth it.',
            photos: [],
            verified: false,
            status: ApprovalStatus.APPROVED,
          },
        ],
      });
    }
  }

  if (zingerBurger) {
    const existing = await prisma.review.findFirst({
      where: { dishId: zingerBurger.id, userId: user.id },
    });
    if (!existing) {
      await prisma.review.create({
        data: {
          userId: user.id,
          dishId: zingerBurger.id,
          rating: 5,
          text: 'Crispy, juicy, perfect every time.',
          photos: [],
          verified: true,
          status: ApprovalStatus.APPROVED,
        },
      });
    }
  }

  console.log('Seed complete:', {
    admin: admin.email,
    user: user.email,
    owner: owner.email,
    enabledCities: DEMO_CITY_IDS,
    ownedRestaurant: 'seed-r1 (Student Biryani)',
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
