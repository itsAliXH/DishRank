'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { City } from '@dishrank/shared';
import { api } from '@/lib/api';

const STORAGE_KEY = 'dishrank_cityId';

interface CityContextType {
  cities: City[];
  cityId: string | null;
  city: City | null;
  setCityId: (id: string | null) => void;
  /** False until localStorage preference is applied and cities are loaded. */
  loading: boolean;
  ready: boolean;
}

const CityContext = createContext<CityContextType | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = localStorage.getItem(STORAGE_KEY);

      try {
        const list = await api.listCities();
        if (cancelled) return;

        setCities(list);

        let next: string | null = stored;
        if (next && !list.some((c) => c.id === next)) {
          localStorage.removeItem(STORAGE_KEY);
          next = null;
        }
        // Prefer saved city; otherwise default so home isn't unfiltered "all cities"
        if (!next && list.length > 0) {
          next =
            list.find((c) => c.id === 'city-karachi')?.id ||
            list.find((c) => c.id === 'city-lahore')?.id ||
            list[0].id;
          localStorage.setItem(STORAGE_KEY, next);
        }
        setCityIdState(next);
      } catch {
        if (!cancelled) {
          setCities([]);
          if (stored) setCityIdState(stored);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setCityId = useCallback((id: string | null) => {
    setCityIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const city = cities.find((c) => c.id === cityId) || null;

  return (
    <CityContext.Provider value={{ cities, cityId, city, setCityId, loading, ready }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error('useCity must be used within CityProvider');
  return ctx;
}
