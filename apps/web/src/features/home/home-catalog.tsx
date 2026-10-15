'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Dish, Restaurant } from '@dishrank/shared';
import { ArrowUpRight, MapPin, Store, Utensils } from 'lucide-react';
import { api } from '@/lib/api';
import { useCity } from '@/providers/city-context';
import { useAuth } from '@/providers/auth-context';
import { useHomeBootstrap } from '@/providers/home-bootstrap-context';
import { mockRestaurants, mockDishes } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { PanelLoading, Spinner } from '@/components/ui/loading';
import { MediaImage } from '@/features/dishes/media-image';

type CatalogRestaurant = Restaurant & {
  _count?: { dishes: number };
  imageUrl?: string | null;
  dishes?: Pick<
    Dish,
    'id' | 'name' | 'category' | 'imageUrl' | 'avgRating' | 'reviewCount' | 'price'
  >[];
};

const PAGE_SIZE = 10;

const TILE_TONES = [
  'from-[#D61F4A] to-[#9F1239]',
  'from-[#1B3A5F] to-[#0F243D]',
  'from-[#C45C26] to-[#7A3416]',
  'from-[#334155] to-[#1E293B]',
  'from-[#9F1239] to-[#4C0519]',
] as const;

function toneFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % TILE_TONES.length;
  }
  return TILE_TONES[hash];
}

function mockCatalogForCity(): CatalogRestaurant[] {
  return mockRestaurants.map((r) => {
    const dishes = mockDishes.filter((d) => d.restaurantId === r.id);
    return {
      ...r,
      dishes: dishes.slice(0, 3),
      _count: { dishes: dishes.length },
    };
  });
}

function RestaurantTile({
  restaurant,
  index,
}: {
  restaurant: CatalogRestaurant;
  index: number;
}) {
  const preview = restaurant.dishes || [];
  const dishCount = restaurant._count?.dishes ?? preview.length;
  const initial = (restaurant.name.trim()[0] || '?').toUpperCase();
  const tone = toneFor(restaurant.id || restaurant.name);

  return (
    <li
      className={cn(
        index < 6 && 'animate-fade-up',
        index === 0 && 'stagger-1',
        index === 1 && 'stagger-2',
        index === 2 && 'stagger-3',
        index === 3 && 'stagger-4',
        index === 4 && 'stagger-5',
        index === 5 && 'stagger-6',
      )}
    >
      <Link href={`/restaurants/${restaurant.id}`} className="group block h-full">
        <article className="flex h-full flex-col overflow-hidden rounded-card border border-border/80 bg-surface shadow-soft transition-all duration-300 ease-soft group-hover:-translate-y-1.5 group-hover:border-primary/30 group-hover:shadow-lift active:scale-[0.99]">
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {restaurant.imageUrl ? (
              <MediaImage
                src={restaurant.imageUrl}
                alt=""
                fill
                className="transition-transform duration-700 ease-soft group-hover:scale-[1.06]"
                placeholderClassName={cn('bg-gradient-to-br', tone)}
              />
            ) : (
              <div
                className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br text-white',
                  tone,
                )}
                aria-hidden="true"
              >
                <span className="font-display text-4xl font-bold tracking-tight opacity-95">
                  {initial}
                </span>
                <span className="mt-2 max-w-[85%] truncate px-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">
                  {restaurant.name}
                </span>
              </div>
            )}

            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden="true"
            />

            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-button bg-black/45 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              <Utensils className="h-3 w-3" aria-hidden="true" />
              {dishCount} dish{dishCount === 1 ? '' : 'es'}
            </span>

            <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-foreground shadow-soft transition-all duration-300 ease-soft group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-sm group-hover:shadow-primary/30">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 p-3.5 sm:p-4">
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold tracking-tight transition-colors duration-200 group-hover:text-primary sm:text-[1.05rem]">
                <span className="line-clamp-1">{restaurant.name}</span>
              </h3>
              <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="line-clamp-2">
                  {restaurant.address || restaurant.city?.name || 'Address TBA'}
                </span>
              </p>
            </div>

            {preview.length > 0 ? (
              <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {preview.slice(0, 3).map((dish) => (
                  <li
                    key={dish.id}
                    className="max-w-full truncate rounded-button bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary"
                  >
                    {dish.name}
                  </li>
                ))}
                {dishCount > preview.slice(0, 3).length && (
                  <li className="rounded-button bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    +{dishCount - Math.min(3, preview.length)} more
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-auto pt-1 text-[11px] font-medium text-muted-foreground">
                Menu coming soon — open to suggest a dish
              </p>
            )}
          </div>
        </article>
      </Link>
    </li>
  );
}

export function HomeCatalog() {
  const { cityId, city, ready } = useCity();
  const { useMockAuth } = useAuth();
  const { homeBootstrap, splashFinished } = useHomeBootstrap();
  const [restaurants, setRestaurants] = useState<CatalogRestaurant[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const bootstrapCatalogRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !homeBootstrap?.catalog || homeBootstrap.cityId !== cityId) return;
    const key = `${cityId ?? 'none'}`;
    if (bootstrapCatalogRef.current === key) return;
    bootstrapCatalogRef.current = key;
    setRestaurants(homeBootstrap.catalog.items as CatalogRestaurant[]);
    setTotal(homeBootstrap.catalog.total);
    setHasMore(homeBootstrap.catalog.hasMore);
    setLoading(false);
  }, [ready, homeBootstrap, cityId]);

  const loadInitial = useCallback(async () => {
    if (!ready) return;
    if (!splashFinished && !homeBootstrap) return;
    if (!cityId) {
      setRestaurants([]);
      setTotal(0);
      setHasMore(false);
      setLoading(false);
      return;
    }

    if (
      homeBootstrap?.catalog &&
      homeBootstrap.cityId === cityId &&
      bootstrapCatalogRef.current === `${cityId}`
    ) {
      return;
    }

    setLoading(true);
    setRestaurants([]);
    setHasMore(false);
    try {
      if (useMockAuth) {
        const all = mockCatalogForCity();
        const page = all.slice(0, PAGE_SIZE);
        setRestaurants(page);
        setTotal(all.length);
        setHasMore(page.length < all.length);
      } else {
        const page = await api.listRestaurantsPage({
          cityId,
          limit: PAGE_SIZE,
          offset: 0,
        });
        setRestaurants(page.items as CatalogRestaurant[]);
        setTotal(page.total);
        setHasMore(page.hasMore);
      }
    } catch {
      setRestaurants([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [cityId, useMockAuth, ready, homeBootstrap, splashFinished]);

  const loadMore = useCallback(async () => {
    if (!cityId || !hasMore || loadingMoreRef.current || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      if (useMockAuth) {
        const all = mockCatalogForCity();
        const next = all.slice(restaurants.length, restaurants.length + PAGE_SIZE);
        setRestaurants((prev) => [...prev, ...next]);
        setHasMore(restaurants.length + next.length < all.length);
      } else {
        const page = await api.listRestaurantsPage({
          cityId,
          limit: PAGE_SIZE,
          offset: restaurants.length,
        });
        setRestaurants((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          const appended = (page.items as CatalogRestaurant[]).filter((r) => !seen.has(r.id));
          return [...prev, ...appended];
        });
        setTotal(page.total);
        setHasMore(page.hasMore);
      }
    } catch {
      /* keep current list; user can scroll again */
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [cityId, hasMore, loading, restaurants.length, useMockAuth]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { root: null, rootMargin: '280px 0px', threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore, restaurants.length]);

  return (
    <section className="mt-10 md:mt-12 animate-fade-up stagger-5">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="section-label flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" aria-hidden="true" />
            Browse all
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {city
              ? `Restaurants in ${city.name} — open a place to see the ranked menu`
              : 'Pick a city in the header to browse restaurants'}
          </p>
        </div>
        {!loading && cityId && (
          <p className="shrink-0 rounded-button bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">
            {restaurants.length}
            {total > restaurants.length ? ` of ${total}` : ''} place
            {total === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {loading || !ready ? (
        <PanelLoading
          label="Loading restaurants…"
          hint={city ? `Finding places in ${city.name}` : 'Preparing your city catalog'}
          rows={2}
          rowHeight="h-48"
        />
      ) : !cityId ? (
        <p className="empty-state">Pick a city in the header to browse restaurants nearby.</p>
      ) : restaurants.length === 0 ? (
        <p className="empty-state">No restaurants{city ? ` in ${city.name}` : ''} yet.</p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {restaurants.map((restaurant, index) => (
              <RestaurantTile key={restaurant.id} restaurant={restaurant} index={index} />
            ))}
          </ul>

          <div ref={sentinelRef} className="h-8 w-full" aria-hidden="true" />

          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Spinner size="sm" />
              Loading more places…
            </div>
          )}

          {!hasMore && total > PAGE_SIZE && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              You’ve seen all {total} places
              {city ? ` in ${city.name}` : ''}.
            </p>
          )}
        </>
      )}
    </section>
  );
}
