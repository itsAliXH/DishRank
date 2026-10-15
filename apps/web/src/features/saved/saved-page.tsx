'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Dish } from '@dishrank/shared';
import { Bookmark } from 'lucide-react';
import { TrendingDishCard } from '@/features/dishes/trending-dish-card';
import { EmptyState } from '@/components/shell/empty-state';
import { AuthDialog } from '@/features/auth/auth-dialog';
import { FormPageShell } from '@/components/shell/form-page-shell';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-context';
import { useBookmarks } from '@/providers/bookmarks-context';
import { PanelLoading } from '@/components/ui/loading';

export default function SavedPage() {
  const { user, useMockAuth } = useAuth();
  const { savedIds, version } = useBookmarks();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user || useMockAuth) {
      setDishes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await api.getBookmarks();
      setDishes(list.filter((d) => savedIds.has(d.id)));
    } catch {
      setDishes([]);
    } finally {
      setLoading(false);
    }
  }, [user, useMockAuth, savedIds]);

  useEffect(() => {
    load();
  }, [load, version]);

  if (!user && !useMockAuth) {
    return (
      <>
        <FormPageShell
          icon={Bookmark}
          title="Saved dishes"
          subtitle="Bookmark plates you want to try later — they sync across search and dish pages."
          asideTitle="Tip"
          asideBody="Tap the bookmark on any dish card to save it. Sign in so your list is waiting next time."
        >
          <EmptyState
            icon={Bookmark}
            title="Sign in to see saved dishes"
            description="Create a free account to keep a personal list of dishes worth coming back for."
            actionLabel="Sign In"
            onAction={() => setAuthOpen(true)}
          />
        </FormPageShell>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} redirectStaff={false} />
      </>
    );
  }

  return (
    <FormPageShell
      icon={Bookmark}
      title="Saved dishes"
      subtitle="Tap the bookmark again to unsave. Changes sync across search and dish pages."
      asideTitle="Your list"
      asideBody={
        loading
          ? 'Loading your bookmarks…'
          : dishes.length === 0
            ? 'Nothing saved yet — discover dishes on the home page and tap the bookmark.'
            : `${dishes.length} dish${dishes.length === 1 ? '' : 'es'} saved for later.`
      }
    >
      {loading ? (
        <PanelLoading
          label="Loading saved dishes…"
          hint="Fetching your bookmarks"
          rows={3}
          rowHeight="h-28"
        />
      ) : dishes.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved dishes"
          description="Bookmark dishes you want to try later. They'll show up here."
          actionLabel="Discover dishes"
          actionHref="/"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {dishes.map((d) => (
            <TrendingDishCard key={d.id} dish={d} />
          ))}
        </div>
      )}
    </FormPageShell>
  );
}
