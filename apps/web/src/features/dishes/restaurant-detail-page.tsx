'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Dish, Restaurant } from '@dishrank/shared';
import { ChevronRight, MapPin, Plus, Star, Utensils } from 'lucide-react';
import { BackButton } from '@/components/shell/back-button';
import { Button } from '@/components/ui/button';
import { MediaImage } from '@/features/dishes/media-image';
import { StarRating } from '@/features/reviews/star-rating';
import { SkeletonBlocks } from '@/components/ui/loading';
import { getRestaurantById, mockDishes } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-context';
import { cn } from '@/lib/utils';

function placeLabel(restaurant: Restaurant) {
  const city = restaurant.city
    ? [restaurant.city.name, restaurant.city.province].filter(Boolean).join(', ')
    : null;
  if (restaurant.address && city) return `${restaurant.address} · ${city}`;
  return restaurant.address || city || 'Location unknown';
}

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { useMockAuth } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (!useMockAuth) {
          const data = await api.getRestaurant(id);
          setRestaurant(data);
          setDishes(
            [...(data.dishes || [])].sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount),
          );
        } else {
          setRestaurant(getRestaurantById(id) || null);
          setDishes(
            mockDishes
              .filter((d) => d.restaurantId === id)
              .sort((a, b) => b.avgRating - a.avgRating),
          );
        }
      } catch {
        if (useMockAuth) {
          setRestaurant(getRestaurantById(id) || null);
          setDishes(
            mockDishes
              .filter((d) => d.restaurantId === id)
              .sort((a, b) => b.avgRating - a.avgRating),
          );
        } else {
          setRestaurant(null);
          setDishes([]);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, useMockAuth]);

  const topDish = dishes[0];
  const canSuggestDish = restaurant?.communityDishSubmitEnabled !== false;
  const addDishHref = `/add-dish?mode=dish&restaurantId=${encodeURIComponent(id)}`;

  const menuStats = useMemo(() => {
    if (dishes.length === 0) return { avg: 0, reviews: 0 };
    const reviews = dishes.reduce((sum, d) => sum + (d.reviewCount || 0), 0);
    const rated = dishes.filter((d) => d.reviewCount > 0);
    const avg =
      rated.length === 0
        ? 0
        : rated.reduce((sum, d) => sum + d.avgRating, 0) / rated.length;
    return { avg, reviews };
  }, [dishes]);

  if (loading) {
    return (
      <div className="page-container py-6">
        <BackButton />
        <div className="mt-4 space-y-4 animate-fade-in" role="status" aria-busy="true">
          <div className="flex items-center gap-3 rounded-card border border-border/70 bg-surface px-3.5 py-3 shadow-soft">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
            </span>
            <p className="text-sm font-medium text-foreground">Loading restaurant…</p>
          </div>
          <div className="aspect-[16/10] skeleton-shimmer sm:aspect-[2/1] md:aspect-[21/9]" />
          <div className="h-9 w-2/3 skeleton-shimmer rounded-button" />
          <div className="h-4 w-1/3 skeleton-shimmer rounded-button" />
          <SkeletonBlocks count={3} heightClass="h-24" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="page-container py-6">
        <BackButton />
        <div className="py-14 text-center">
          <p className="mb-4 text-muted-foreground">Restaurant not found</p>
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-5 md:py-8 pb-28 md:pb-10">
      <BackButton />

      {/* Hero */}
      <header className="relative mt-4 overflow-hidden rounded-card border border-border/80 bg-surface">
        <div className="relative aspect-[16/10] sm:aspect-[2/1] md:aspect-[21/9]">
          <MediaImage src={restaurant.imageUrl} alt={restaurant.name} fill />
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(180deg, rgba(20,24,32,0.05) 0%, rgba(20,24,32,0.55) 55%, rgba(20,24,32,0.82) 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 md:p-8">
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-white/80">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {placeLabel(restaurant)}
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
              {restaurant.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-button bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <Utensils className="h-3.5 w-3.5" aria-hidden="true" />
                {dishes.length} dish{dishes.length === 1 ? '' : 'es'}
              </span>
              {menuStats.reviews > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-button bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  {menuStats.avg.toFixed(1)} menu avg · {menuStats.reviews} reviews
                </span>
              ) : (
                <span className="inline-flex items-center rounded-button bg-white/15 px-2.5 py-1 text-xs font-medium text-white/85 backdrop-blur-sm">
                  No ratings yet
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Menu ranked by community ratings. Missing a plate? Suggest it for this venue.
        </p>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href={addDishHref}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add a dish here
          </Link>
        </Button>
      </div>

      {/* Signature dish */}
      {topDish && (
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
                Signature pick
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Highest-rated dish at this restaurant
              </p>
            </div>
          </div>
          <Link
            href={`/dishes/${topDish.id}`}
            className="group block overflow-hidden rounded-card border border-border/80 bg-surface transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
          >
            <div className="flex gap-0 sm:items-stretch">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-40 md:w-48">
                <MediaImage
                  src={topDish.imageUrl}
                  alt={topDish.name}
                  fill
                  className="transition-transform duration-500 ease-soft group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3.5 sm:px-5">
                {topDish.category ? (
                  <span className="mb-1.5 inline-flex w-fit rounded-button bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {topDish.category}
                  </span>
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold tracking-tight transition-colors group-hover:text-primary sm:text-xl">
                    {topDish.name}
                  </h3>
                  <ChevronRight
                    className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StarRating
                    rating={topDish.avgRating}
                    size="sm"
                    showValue
                    reviewCount={topDish.reviewCount}
                  />
                  {topDish.price != null && (
                    <span className="text-sm font-semibold text-foreground">
                      Rs. {topDish.price}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Full menu */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
              Menu
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Ranked by rating</p>
          </div>
          {dishes.length > 0 && canSuggestDish && (
            <Button asChild variant="outline" size="sm">
              <Link href={addDishHref}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Suggest dish
              </Link>
            </Button>
          )}
        </div>

        {dishes.length === 0 ? (
          <div className="rounded-card border border-dashed border-border/90 bg-surface/60 px-5 py-12 text-center">
            <Utensils className="mx-auto mb-3 h-8 w-8 text-muted-foreground/45" aria-hidden="true" />
            <p className="font-display text-base font-semibold">No dishes listed yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              {canSuggestDish
                ? `Be the first to suggest a dish for ${restaurant.name}. It goes to admin review before appearing here.`
                : `${restaurant.name} isn’t accepting community dish suggestions right now.`}
            </p>
            {canSuggestDish && (
              <Button asChild className="mt-5">
                <Link href={addDishHref}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add the first dish
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {dishes.map((dish, index) => (
              <li key={dish.id}>
                <Link
                  href={`/dishes/${dish.id}`}
                  className={cn(
                    'group flex items-center gap-3 rounded-card border border-border/80 bg-surface p-2.5 transition-all duration-300 ease-soft',
                    'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift active:scale-[0.99]',
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-muted text-xs font-bold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-button bg-muted sm:h-[4.5rem] sm:w-[4.5rem]">
                    <MediaImage
                      src={dish.imageUrl}
                      alt=""
                      fill
                      className="transition-transform duration-500 ease-soft group-hover:scale-[1.05]"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display font-semibold transition-colors group-hover:text-primary">
                          {dish.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[dish.category, dish.price != null ? `Rs. ${dish.price}` : null]
                            .filter(Boolean)
                            .join(' · ') || 'No category'}
                        </p>
                      </div>
                      <ChevronRight
                        className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-1.5">
                      <StarRating
                        rating={dish.avgRating}
                        size="sm"
                        showValue
                        reviewCount={dish.reviewCount}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
