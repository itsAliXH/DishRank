'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DishResultCard } from '@/features/dishes/dish-result-card';
import { EmptyState } from '@/components/shell/empty-state';
import { useLocation } from '@/providers/location-context';
import {
  mockDishes,
  mockRestaurants,
  getDistanceKm,
  searchDishes,
  searchRestaurants,
} from '@/lib/mock-data';
import type { Dish, Restaurant } from '@dishrank/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-context';
import { BackButton } from '@/components/shell/back-button';
import { setStoredSearchType, type SearchType } from '@/lib/search-prefs';

function restaurantDistanceKm(
  lat: number,
  lng: number,
  restaurant: Restaurant,
): number {
  const R = 6371;
  const dLat = ((restaurant.lat - lat) * Math.PI) / 180;
  const dLng = ((restaurant.lng - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((restaurant.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function NearMeResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const type: SearchType =
    searchParams.get('type') === 'restaurant' ? 'restaurant' : 'dish';
  const { lat, lng, requestLocation, loading, error } = useLocation();
  const { useMockAuth } = useAuth();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    setStoredSearchType(type);
  }, [type]);

  useEffect(() => {
    if (lat == null || lng == null) return;

    async function load() {
      setFetching(true);
      try {
        if (!useMockAuth) {
          const results = await api.search({
            q: query || undefined,
            type,
            lat,
            lng,
            radius: 5,
            sort: 'distance',
          });
          if (type === 'restaurant') {
            setRestaurants(results as Restaurant[]);
            setDishes([]);
          } else {
            setDishes(results as Dish[]);
            setRestaurants([]);
          }
        } else if (type === 'restaurant') {
          const base = query ? searchRestaurants(query) : [...mockRestaurants];
          setRestaurants(
            base
              .map((r) => ({ r, dist: restaurantDistanceKm(lat!, lng!, r) }))
              .filter((x) => x.dist <= 5)
              .sort((a, b) => a.dist - b.dist)
              .map((x) => x.r),
          );
          setDishes([]);
        } else {
          const base = query
            ? searchDishes(query, { sort: 'distance', lat: lat!, lng: lng! })
            : [...mockDishes]
                .map((d) => ({ dish: d, dist: getDistanceKm(lat!, lng!, d) }))
                .filter((x) => x.dist !== null && x.dist <= 5)
                .sort((a, b) => a.dist! - b.dist!)
                .map((x) => x.dish);
          setDishes(base);
          setRestaurants([]);
        }
      } catch {
        setDishes([]);
        setRestaurants([]);
      } finally {
        setFetching(false);
      }
    }
    void load();
  }, [lat, lng, useMockAuth, query, type]);

  const isRestaurant = type === 'restaurant';
  const resultCount = isRestaurant ? restaurants.length : dishes.length;

  return (
    <div className="page-container py-5 md:py-8">
      <BackButton />
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" aria-hidden="true" />
          {query
            ? `"${query}" near you`
            : isRestaurant
              ? 'Restaurants Near You'
              : 'Dishes Near You'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {query
            ? `Matching “${query}” within 5 km, nearest first`
            : isRestaurant
              ? 'Top restaurants within 5 km, nearest first'
              : 'Top dishes within 5 km, nearest first'}
        </p>
      </div>

      {!lat && (
        <div className="rounded-card border border-border bg-surface p-6 sm:p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <h2 className="font-semibold mb-2">Enable location</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            {query
              ? `We need your location to find “${query}” nearby. Coordinates are never stored.`
              : isRestaurant
                ? 'We use your location to find nearby restaurants. Your coordinates are never stored.'
                : 'We use your location to find the best-rated dishes nearby. Your coordinates are never stored.'}
          </p>
          <Button onClick={requestLocation} disabled={loading} size="lg" className="w-full sm:w-auto">
            {loading ? 'Getting location...' : 'Enable Location'}
          </Button>
          {error && (
            <p className="text-sm text-red-600 mt-3" role="alert">
              {error}. Check your browser permissions and try again.
            </p>
          )}
        </div>
      )}

      {lat != null && fetching && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-card bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {lat != null && !fetching && (
        <div className="space-y-3">
          {resultCount === 0 ? (
            <EmptyState
              icon={MapPin}
              title={query ? `No “${query}” nearby` : 'Nothing nearby yet'}
              description={
                query
                  ? isRestaurant
                    ? `No restaurants matching “${query}” within 5 km. Try a broader search.`
                    : `No dishes matching “${query}” within 5 km. Try a broader search or another dish.`
                  : isRestaurant
                    ? 'No restaurants found within 5 km. Try searching for a specific place instead.'
                    : 'No dishes found within 5 km. Try searching for a specific dish instead.'
              }
              actionLabel={
                query
                  ? 'Search without location'
                  : isRestaurant
                    ? 'Search restaurants'
                    : 'Search dishes'
              }
              actionHref={
                query
                  ? `/search?q=${encodeURIComponent(query)}&type=${type}&sort=rating`
                  : `/search?type=${type}`
              }
            />
          ) : isRestaurant ? (
            restaurants.map((r) => {
              const dist = restaurantDistanceKm(lat, lng!, r);
              return (
                <Link
                  key={r.id}
                  href={`/restaurants/${r.id}`}
                  className="block rounded-card border border-border bg-surface p-4 transition-all hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{r.name}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground truncate">
                        {r.address}
                        {r.city?.name ? ` · ${r.city.name}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {dist.toFixed(1)} km
                    </span>
                  </div>
                </Link>
              );
            })
          ) : (
            dishes.map((d) => (
              <DishResultCard key={d.id} dish={d} distanceKm={getDistanceKm(lat, lng!, d)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function NearMePage() {
  return (
    <Suspense
      fallback={
        <div className="page-container py-8">
          <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-card bg-muted" />
            ))}
          </div>
        </div>
      }
    >
      <NearMeResults />
    </Suspense>
  );
}
