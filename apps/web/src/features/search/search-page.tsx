'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import type { Dish, Restaurant } from '@dishrank/shared';
import { DishResultCard } from '@/features/dishes/dish-result-card';
import { SearchBar } from '@/components/shell/search-bar';
import { EmptyState } from '@/components/shell/empty-state';
import { Button } from '@/components/ui/button';
import { searchDishes, searchRestaurants, getDistanceKm } from '@/lib/mock-data';
import { useLocation } from '@/providers/location-context';
import { useCity } from '@/providers/city-context';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-context';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/shell/back-button';
import { CitySelect } from '@/components/shell/city-select';
import { PanelLoading } from '@/components/ui/loading';

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top rated' },
  { value: 'price', label: 'Price' },
  { value: 'distance', label: 'Nearest' },
  { value: 'reviews', label: 'Most reviewed' },
] as const;

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const type = (searchParams.get('type') as 'dish' | 'restaurant') || 'dish';
  const sort = searchParams.get('sort') || 'rating';
  const minRating = Number(searchParams.get('minRating') || 0);
  const cityParam = searchParams.get('cityId') || '';
  // Empty Search click still sets type/sort — browse top-rated without a query
  const hasSearchIntent =
    searchParams.has('type') ||
    searchParams.has('q') ||
    searchParams.has('sort') ||
    !!cityParam;
  const { lat, lng, requestLocation, loading: locating, error: locationError } = useLocation();
  const { useMockAuth } = useAuth();
  const { cityId: preferredCityId, setCityId } = useCity();

  // Prefer URL city, fall back to global preference
  const cityId = cityParam || preferredCityId || '';

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const needsLocationForSort = type === 'dish' && sort === 'distance' && !lat;

  useEffect(() => {
    let cancelled = false;

    async function fetchResults() {
      if (type === 'dish' && sort === 'distance' && (lat == null || lng == null)) {
        setDishes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (!useMockAuth) {
          const results = await api.search({
            q: query || undefined,
            type,
            sort,
            minRating: minRating || undefined,
            cityId: cityId || undefined,
            lat: sort === 'distance' ? lat || undefined : undefined,
            lng: sort === 'distance' ? lng || undefined : undefined,
            radius: sort === 'distance' ? 5 : undefined,
          });
          if (cancelled) return;
          if (type === 'restaurant') {
            setRestaurants(results as Restaurant[]);
            setDishes([]);
          } else {
            setDishes(results as Dish[]);
            setRestaurants([]);
          }
        } else if (type === 'restaurant') {
          if (cancelled) return;
          setRestaurants(searchRestaurants(query));
          setDishes([]);
        } else {
          if (cancelled) return;
          setDishes(
            searchDishes(query, {
              sort,
              minRating: minRating || undefined,
              lat: sort === 'distance' ? lat || undefined : undefined,
              lng: sort === 'distance' ? lng || undefined : undefined,
            }),
          );
          setRestaurants([]);
        }
      } catch {
        if (cancelled) return;
        if (useMockAuth) {
          if (type === 'restaurant') {
            setRestaurants(searchRestaurants(query));
            setDishes([]);
          } else {
            setDishes(
              searchDishes(query, {
                sort,
                minRating: minRating || undefined,
                lat: sort === 'distance' ? lat || undefined : undefined,
                lng: sort === 'distance' ? lng || undefined : undefined,
              }),
            );
            setRestaurants([]);
          }
        } else {
          setDishes([]);
          setRestaurants([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (hasSearchIntent) fetchResults();
    else {
      setLoading(false);
      setDishes([]);
      setRestaurants([]);
    }

    return () => {
      cancelled = true;
    };
  }, [query, type, sort, minRating, lat, lng, useMockAuth, cityId, hasSearchIntent]);

  const updateSort = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    router.push(`/search?${params.toString()}`);
    if (newSort === 'distance' && !lat) {
      requestLocation();
    }
  };

  const updateCity = (next: string | null) => {
    setCityId(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('cityId', next);
    else params.delete('cityId');
    router.push(`/search?${params.toString()}`);
  };

  if (!hasSearchIntent) {
    return (
      <div className="page-container py-5 md:py-8">
        <BackButton />
        <div className="mb-4 max-w-sm">
          <label className="text-sm font-medium mb-1 block">City</label>
          <CitySelect value={cityId || null} onChange={updateCity} />
        </div>
        <EmptyState
          icon={Search}
          title="Start searching"
          description="Search a name, or hit Search for top-rated dishes or restaurants."
          actionLabel="Go to home"
          actionHref="/"
        />
      </div>
    );
  }

  const resultCount = type === 'dish' ? dishes.length : restaurants.length;

  return (
    <div className="page-container py-5 md:py-8">
      <BackButton />
      <div className="mb-4 md:hidden space-y-3">
        <SearchBar />
        <CitySelect value={cityId || null} onChange={updateCity} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:block lg:w-56 shrink-0">
          <div className="sticky top-20 p-4 rounded-card border border-border bg-surface space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">City</h3>
              <CitySelect value={cityId || null} onChange={updateCity} />
            </div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Sort
            </h3>
            {type === 'dish' && (
              <div className="flex flex-col gap-1.5">
                {SORT_OPTIONS.map((s) => (
                  <Button
                    key={s.value}
                    variant={sort === s.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSort(s.value)}
                    className="justify-start"
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            )}
            {type === 'restaurant' && (
              <p className="text-xs text-muted-foreground">
                {query
                  ? 'Restaurant results are matched by name.'
                  : 'Showing top-rated restaurants by dish scores.'}
              </p>
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate">
                {loading
                  ? 'Searching...'
                  : query
                    ? `"${query}"`
                    : type === 'restaurant'
                      ? 'Top rated restaurants'
                      : 'Top rated dishes'}
              </h1>
              {!loading && !needsLocationForSort && (
                <p className="text-sm text-muted-foreground">
                  {resultCount}{' '}
                  {type === 'dish'
                    ? resultCount === 1
                      ? 'dish'
                      : 'dishes'
                    : resultCount === 1
                      ? 'restaurant'
                      : 'restaurants'}{' '}
                  found
                  {type === 'dish' && sort === 'rating' ? ' · sorted by rating' : ''}
                  {type === 'dish' && sort === 'price' ? ' · lowest price first' : ''}
                  {type === 'dish' && sort === 'distance' ? ' · within 5 km' : ''}
                  {type === 'dish' && sort === 'reviews' ? ' · most reviews first' : ''}
                  {type === 'restaurant' && !query ? ' · sorted by rating' : ''}
                </p>
              )}
            </div>
          </div>

          {type === 'dish' && (
            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 lg:hidden snap-scroll-x">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateSort(s.value)}
                  className={cn(
                    'snap-item shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    sort === s.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {needsLocationForSort && (
            <div className="rounded-card border border-border bg-surface p-6 text-center mb-4">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-3" aria-hidden="true" />
              <h2 className="font-semibold mb-1">Location needed</h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Enable location to sort dishes by nearest restaurants (within 5 km).
              </p>
              <Button onClick={requestLocation} disabled={locating}>
                {locating ? 'Getting location...' : 'Enable Location'}
              </Button>
              {locationError && (
                <p className="text-sm text-red-600 mt-2" role="alert">
                  {locationError}
                </p>
              )}
            </div>
          )}

          {loading && !needsLocationForSort && (
            <PanelLoading
              label="Searching…"
              hint="Finding matching restaurants and dishes"
              rows={4}
              rowHeight="h-24"
            />
          )}

          {!loading && type === 'restaurant' && (
            <div className="space-y-3">
              {restaurants.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No restaurants found"
                  description={
                    query
                      ? `We couldn't find restaurants matching "${query}". Be the first to add it!`
                      : 'No restaurants match your filters.'
                  }
                  actionLabel={
                    query.trim()
                      ? `Add restaurant “${query.trim()}”`
                      : 'Add a restaurant'
                  }
                  actionHref={
                    query.trim()
                      ? `/add-dish?mode=restaurant&name=${encodeURIComponent(query.trim())}`
                      : '/add-dish?mode=restaurant'
                  }
                />
              ) : (
                restaurants.map((r) => (
                  <Link
                    key={r.id}
                    href={`/restaurants/${r.id}`}
                    className="block p-4 rounded-card border border-border bg-surface hover:shadow-md active:scale-[0.99] transition-all"
                  >
                    <h3 className="font-semibold">{r.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{r.address}</p>
                  </Link>
                ))
              )}
            </div>
          )}

          {!loading && type === 'dish' && !needsLocationForSort && (
            <>
              {dishes.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No dishes found"
                  description={
                    query.trim()
                      ? `We couldn't find dishes matching "${query.trim()}". Be the first to add it!`
                      : 'No dishes match your filters.'
                  }
                  actionLabel={
                    query.trim()
                      ? `Add dish “${query.trim()}”`
                      : 'Add a dish'
                  }
                  actionHref={
                    query.trim()
                      ? `/add-dish?mode=dish&name=${encodeURIComponent(query.trim())}`
                      : '/add-dish?mode=dish'
                  }
                />
              ) : (
                <>
                  <div className="space-y-3 lg:hidden">
                    {dishes.map((d) => (
                      <DishResultCard
                        key={d.id}
                        dish={d}
                        distanceKm={lat && lng ? getDistanceKm(lat, lng, d) : null}
                      />
                    ))}
                  </div>

                  <div className="hidden lg:block overflow-x-auto rounded-card border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground bg-muted/50">
                          <th className="px-4 py-3 font-medium">Dish</th>
                          <th className="px-4 py-3 font-medium">Restaurant</th>
                          <th className="px-4 py-3 font-medium">Rating</th>
                          <th className="px-4 py-3 font-medium">Price</th>
                          <th className="px-4 py-3 font-medium">Reviews</th>
                          {lat && lng && (
                            <th className="px-4 py-3 font-medium">Distance</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {dishes.map((d) => {
                          const distance =
                            lat && lng ? getDistanceKm(lat, lng, d) : null;
                          return (
                            <tr
                              key={d.id}
                              className="border-b border-border last:border-0 hover:bg-muted/30"
                            >
                              <td className="px-4 py-3">
                                <Link
                                  href={`/dishes/${d.id}`}
                                  className="font-medium hover:text-primary"
                                >
                                  {d.name}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                <Link
                                  href={`/restaurants/${d.restaurantId}`}
                                  className="hover:text-foreground"
                                >
                                  {d.restaurant?.name}
                                </Link>
                              </td>
                              <td className="px-4 py-3 font-semibold text-primary">
                                {d.avgRating.toFixed(1)}
                              </td>
                              <td className="px-4 py-3">
                                {d.price != null ? `Rs. ${d.price}` : '—'}
                              </td>
                              <td className="px-4 py-3">{d.reviewCount}</td>
                              {lat && lng && (
                                <td className="px-4 py-3 text-muted-foreground">
                                  {distance != null ? `${distance.toFixed(1)} km` : '—'}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container py-8">
          <PanelLoading
            label="Opening search…"
            hint="Preparing filters and results"
            rows={3}
            rowHeight="h-24"
          />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
