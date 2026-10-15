'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Dish } from '@dishrank/shared';
import { AppSplash } from '@/components/shell/app-splash';
import { useAuth } from '@/providers/auth-context';
import { useCity } from '@/providers/city-context';
import { api } from '@/lib/api';
import {
  mockDishes,
  mockRestaurants,
  popularSearches as mockPopular,
  trendingDishes,
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const MIN_SPLASH_MS = 1600;
const MAX_SPLASH_MS = 3800;
const EXIT_MS = 700;

export type HomeCatalogBootstrap = {
  items: unknown[];
  total: number;
  hasMore: boolean;
};

export type HomeBootstrapPayload = {
  cityId: string | null;
  trending: Dish[];
  popular: string[];
  catalog: HomeCatalogBootstrap | null;
};

interface HomeBootstrapContextType {
  homeBootstrap: HomeBootstrapPayload | null;
  splashFinished: boolean;
}

const HomeBootstrapContext = createContext<HomeBootstrapContextType | null>(null);

function mockCatalogPage() {
  const items = mockRestaurants.map((r) => ({
    ...r,
    dishes: mockDishes.filter((d) => d.restaurantId === r.id).slice(0, 3),
    _count: { dishes: mockDishes.filter((d) => d.restaurantId === r.id).length },
  }));
  return {
    items: items.slice(0, 10),
    total: items.length,
    hasMore: items.length > 10,
  };
}

export function HomeBootstrapProvider({ children }: { children: ReactNode }) {
  const { useMockAuth } = useAuth();
  const { cityId, ready } = useCity();
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);
  const [progress, setProgress] = useState(8);
  const [homeBootstrap, setHomeBootstrap] = useState<HomeBootstrapPayload | null>(null);
  const dismissedRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataReadyRef = useRef(false);
  const minElapsedRef = useRef(false);

  const tryFinish = useCallback(() => {
    if (dismissedRef.current) return;
    if (!dataReadyRef.current || !minElapsedRef.current) return;

    dismissedRef.current = true;
    setProgress(100);
    // Let the bar reach 100% before fading out
    setTimeout(() => {
      setSplashExiting(true);
      exitTimerRef.current = setTimeout(() => {
        setSplashVisible(false);
        setSplashFinished(true);
      }, EXIT_MS);
    }, 220);
  }, []);

  // Smooth progress crawl while loading (never loops — feels intentional)
  useEffect(() => {
    if (!splashVisible || splashExiting) return;
    const ticks = [
      { at: 120, value: 18 },
      { at: 320, value: 34 },
      { at: 580, value: 48 },
      { at: 900, value: 62 },
      { at: 1300, value: 74 },
      { at: 1800, value: 84 },
      { at: 2400, value: 90 },
    ];
    const timers = ticks.map(({ at, value }) =>
      setTimeout(() => {
        setProgress((p) => (p >= 100 ? p : Math.max(p, value)));
      }, at),
    );
    return () => timers.forEach(clearTimeout);
  }, [splashVisible, splashExiting]);

  // Minimum brand moment
  useEffect(() => {
    const t = setTimeout(() => {
      minElapsedRef.current = true;
      tryFinish();
    }, MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, [tryFinish]);

  // Hard failsafe
  useEffect(() => {
    const failsafe = setTimeout(() => {
      dataReadyRef.current = true;
      minElapsedRef.current = true;
      tryFinish();
    }, MAX_SPLASH_MS);
    return () => clearTimeout(failsafe);
  }, [tryFinish]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    (async () => {
      let payload: HomeBootstrapPayload;

      try {
        if (useMockAuth) {
          await new Promise((r) => setTimeout(r, 280));
          if (cancelled) return;
          payload = {
            cityId,
            trending: trendingDishes,
            popular: mockPopular,
            catalog: mockCatalogPage(),
          };
        } else if (!cityId) {
          const terms = await api.getPopularSearches().catch(() => [] as string[]);
          if (cancelled) return;
          payload = {
            cityId: null,
            trending: [],
            popular: terms.length ? terms : mockPopular,
            catalog: null,
          };
        } else {
          const [dishes, terms, page] = await Promise.all([
            api.getTrending(cityId).catch(() => [] as Dish[]),
            api.getPopularSearches().catch(() => [] as string[]),
            api
              .listRestaurantsPage({ cityId, limit: 10, offset: 0 })
              .catch(() => null),
          ]);
          if (cancelled) return;
          payload = {
            cityId,
            trending: dishes,
            popular: terms.length ? terms : mockPopular,
            catalog: page
              ? {
                  items: page.items,
                  total: page.total,
                  hasMore: page.hasMore,
                }
              : null,
          };
        }
      } catch {
        if (cancelled) return;
        payload = {
          cityId,
          trending: [],
          popular: mockPopular,
          catalog: null,
        };
      }

      if (cancelled) return;
      setHomeBootstrap(payload);
      setProgress((p) => Math.max(p, 92));
      dataReadyRef.current = true;
      tryFinish();
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, cityId, useMockAuth, tryFinish]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Keep page content hidden until splash finishes — avoids janky “double reveal”
  const appReady = splashFinished;

  return (
    <HomeBootstrapContext.Provider value={{ homeBootstrap, splashFinished }}>
      <AppSplash visible={splashVisible} exiting={splashExiting} progress={progress} />
      <div
        className={cn(
          'flex min-h-dvh flex-col transition-opacity duration-500 ease-soft',
          appReady ? 'opacity-100' : 'opacity-0',
        )}
      >
        {children}
      </div>
    </HomeBootstrapContext.Provider>
  );
}

export function useHomeBootstrap() {
  const ctx = useContext(HomeBootstrapContext);
  if (!ctx) {
    throw new Error('useHomeBootstrap must be used within HomeBootstrapProvider');
  }
  return ctx;
}
