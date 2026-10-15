'use client';

import { Suspense, useEffect, useState } from 'react';
import { SearchBar } from '@/components/shell/search-bar';
import { TrendingDishCard } from '@/features/dishes/trending-dish-card';
import { HomeCatalog } from '@/features/home/home-catalog';
import { PopularSearchTiles } from '@/features/home/popular-search-tiles';
import { popularSearches as mockPopular, trendingDishes } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useAuth } from '@/providers/auth-context';
import { useCity } from '@/providers/city-context';
import { useHomeBootstrap } from '@/providers/home-bootstrap-context';
import { api } from '@/lib/api';
import type { Dish } from '@dishrank/shared';
import { cn } from '@/lib/utils';
import { getStoredSearchType } from '@/lib/search-prefs';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1800&q=80';

export default function HomePage() {
  const router = useRouter();
  const { useMockAuth } = useAuth();
  const { cityId, city, ready } = useCity();
  const { homeBootstrap } = useHomeBootstrap();
  const [trending, setTrending] = useState<Dish[]>(useMockAuth ? trendingDishes : []);
  const [popular, setPopular] = useState<string[]>(useMockAuth ? mockPopular : []);
  const [loadingTrending, setLoadingTrending] = useState(!useMockAuth);

  useEffect(() => {
    if (useMockAuth) {
      setTrending(trendingDishes);
      setPopular(mockPopular);
      setLoadingTrending(false);
      return;
    }

    if (!ready) return;

    if (homeBootstrap && homeBootstrap.cityId === cityId) {
      setTrending(homeBootstrap.trending);
      setPopular(homeBootstrap.popular);
      setLoadingTrending(false);
      return;
    }

    async function load() {
      setLoadingTrending(true);
      try {
        if (!cityId) {
          setTrending([]);
          const terms = await api.getPopularSearches().catch(() => [] as string[]);
          setPopular(terms.length ? terms : mockPopular);
          return;
        }
        const [dishes, terms] = await Promise.all([
          api.getTrending(cityId),
          api.getPopularSearches().catch(() => [] as string[]),
        ]);
        setTrending(dishes);
        setPopular(terms.length ? terms : mockPopular);
      } catch {
        setTrending([]);
        setPopular([]);
      } finally {
        setLoadingTrending(false);
      }
    }

    load();
  }, [useMockAuth, cityId, ready, homeBootstrap]);

  return (
    <div className="pb-6 md:pb-10">
      <section className="hero-bleed relative z-10 min-h-[min(72vh,560px)] text-white">
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt=""
            className="h-full w-full object-cover animate-slow-zoom"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/55 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />
        </div>

        <div className="relative page-container flex min-h-[min(72vh,560px)] flex-col justify-end pb-10 pt-16 md:pb-14 md:pt-20">
          <div className="max-w-2xl">
            <p className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-sm animate-fade-up">
              DishRank
            </p>
            <h1 className="mt-3 text-xl sm:text-2xl md:text-[1.65rem] font-medium text-white/90 leading-snug tracking-tight animate-fade-up stagger-2">
              Find the best dish near you
            </h1>
            <p className="mt-2.5 text-sm sm:text-base text-white/70 max-w-md leading-relaxed animate-fade-up stagger-3">
              {city
                ? `Searching around ${city.name}. Rate the plate — not just the place.`
                : 'Pick a city in the header, then search by dish. Rate the plate — not just the place.'}
            </p>
          </div>
          <div className="relative z-30 mt-7 max-w-xl animate-fade-up stagger-4">
            <Suspense fallback={null}>
              <SearchBar size="large" tone="onDark" />
            </Suspense>
          </div>
        </div>
      </section>

      <div className="page-container">
        <PopularSearchTiles terms={popular} />

        <section className="mt-10 md:mt-12 animate-fade-up stagger-4">
          <div className="flex items-end justify-between gap-3 mb-5">
            <div>
              <h2 className="section-label flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
                Trending
                {city ? (
                  <span className="font-sans text-base font-medium text-muted-foreground">
                    in {city.name}
                  </span>
                ) : null}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {city
                  ? `Highest-rated plates in ${city.name}`
                  : 'Highest-rated plates near you'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/near-me?type=${getStoredSearchType()}`)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all duration-200 hover:gap-1.5 hover:underline underline-offset-4 shrink-0"
            >
              Near me
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {loadingTrending || !ready ? (
            <div className="snap-scroll-x md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible md:pb-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="snap-item shrink-0 w-[44vw] sm:w-48 md:w-auto h-56 skeleton-shimmer"
                />
              ))}
            </div>
          ) : !cityId ? (
            <p className="empty-state animate-scale-in">
              Pick a city in the header to see trending dishes nearby.
            </p>
          ) : trending.length === 0 ? (
            <p className="empty-state animate-scale-in">
              {city ? `No trending dishes in ${city.name} yet.` : 'No trending dishes yet.'}
            </p>
          ) : (
            <div className="snap-scroll-x md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible md:pb-0">
              {trending.map((dish, i) => (
                <div
                  key={dish.id}
                  className={cn(
                    'snap-item shrink-0 w-[44vw] sm:w-48 md:w-auto animate-fade-up',
                    i < 5 && `stagger-${i + 1}`,
                  )}
                >
                  <TrendingDishCard dish={dish} />
                </div>
              ))}
            </div>
          )}
        </section>

        <HomeCatalog />

        <section className="hidden md:block mt-12 animate-fade-up">
          <div className="rounded-card border border-border/80 bg-gradient-to-br from-primary-soft/80 via-surface to-secondary-soft/50 px-6 py-7 shadow-soft">
            <p className="font-display text-base font-bold">Install DishRank on your phone</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-lg leading-relaxed">
              Open on mobile and tap &ldquo;Add to Home Screen&rdquo; for faster access, Near Me, and
              receipt verification.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
