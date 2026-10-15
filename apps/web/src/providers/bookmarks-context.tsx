'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-context';

interface BookmarksContextType {
  savedIds: Set<string>;
  /** Increments on each change — use as effect dependency for lists. */
  version: number;
  isSaved: (dishId: string) => boolean;
  toggle: (dishId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  loading: boolean;
}

const BookmarksContext = createContext<BookmarksContextType | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading, useMockAuth } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!user || useMockAuth) {
      setSavedIds(new Set());
      setVersion((v) => v + 1);
      return;
    }
    setLoading(true);
    try {
      const ids = await api.getBookmarkIds();
      setSavedIds(new Set(Array.isArray(ids) ? ids : []));
      setVersion((v) => v + 1);
    } catch {
      setSavedIds(new Set());
      setVersion((v) => v + 1);
    } finally {
      setLoading(false);
    }
  }, [user, useMockAuth, authLoading]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isSaved = useCallback((dishId: string) => savedIds.has(dishId), [savedIds]);

  const toggle = useCallback(
    async (dishId: string) => {
      if (!user || useMockAuth) {
        throw new Error('Sign in to save dishes');
      }

      const wasSaved = savedIds.has(dishId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(dishId);
        else next.add(dishId);
        return next;
      });
      setVersion((v) => v + 1);

      try {
        const res = await api.toggleBookmark(dishId);
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (res.saved) next.add(dishId);
          else next.delete(dishId);
          return next;
        });
        setVersion((v) => v + 1);
        return res.saved;
      } catch (err) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(dishId);
          else next.delete(dishId);
          return next;
        });
        setVersion((v) => v + 1);
        throw err;
      }
    },
    [user, useMockAuth, savedIds],
  );

  const value = useMemo(
    () => ({ savedIds, version, isSaved, toggle, refresh, loading }),
    [savedIds, version, isSaved, toggle, refresh, loading],
  );

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx) throw new Error('useBookmarks must be used within BookmarksProvider');
  return ctx;
}
