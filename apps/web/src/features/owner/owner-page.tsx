'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Dish, Restaurant } from '@dishrank/shared';
import {
  Bookmark,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Store,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/shell/back-button';
import { OwnerCatalogManager } from '@/features/owner/owner-catalog-manager';
import {
  InboxReviewDialog,
  type DishApproveEdits,
  type InboxReviewTarget,
} from '@/features/inbox/inbox-review-dialog';
import { MediaImage } from '@/features/dishes/media-image';
import {
  ProfileAccountPanel,
  ProfileReviewsPanel,
  ProfileSavedPanel,
} from '@/features/profile/profile-personal-panels';
import { useAuth } from '@/providers/auth-context';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type OwnedRestaurant = Restaurant & { dishes: Dish[] };

type OwnerTab =
  | 'overview'
  | 'inbox'
  | 'catalog'
  | 'reviews'
  | 'saved'
  | 'account';

const NAV: {
  id: OwnerTab;
  label: string;
  hint: string;
  icon: LucideIcon;
  group: 'work' | 'you';
}[] = [
  { id: 'overview', label: 'Overview', hint: 'Snapshot & shortcuts', icon: LayoutDashboard, group: 'work' },
  { id: 'inbox', label: 'Inbox', hint: 'Approve new dishes', icon: Inbox, group: 'work' },
  { id: 'catalog', label: 'My restaurants', hint: 'Pictures & categories', icon: FolderOpen, group: 'work' },
  { id: 'reviews', label: 'My reviews', hint: 'Ratings you left', icon: MessageSquareText, group: 'you' },
  { id: 'saved', label: 'Saved', hint: 'Bookmarked dishes', icon: Bookmark, group: 'you' },
  { id: 'account', label: 'Account', hint: 'Name, email & phone', icon: Settings, group: 'you' },
];

const VALID_TABS = new Set(NAV.map((n) => n.id));

function OwnerPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, useMockAuth, logout } = useAuth();

  const tabParam = searchParams.get('tab') || 'overview';
  const tab: OwnerTab = VALID_TABS.has(tabParam as OwnerTab)
    ? (tabParam as OwnerTab)
    : 'overview';

  const setTab = (next: OwnerTab) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', next);
    router.replace(`/owner?${sp.toString()}`, { scroll: false });
  };

  const [pendingDishes, setPendingDishes] = useState<Dish[]>([]);
  const [restaurants, setRestaurants] = useState<OwnedRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || useMockAuth) {
      setPendingDishes([]);
      setRestaurants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pending, owned] = await Promise.all([
        api.getOwnerPendingDishes(),
        api.getOwnerRestaurants(),
      ]);
      setPendingDishes(pending);
      setRestaurants(owned);
    } catch {
      setPendingDishes([]);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [user, useMockAuth]);

  useEffect(() => {
    load();
  }, [load]);

  const dishCount = useMemo(
    () => restaurants.reduce((sum, r) => sum + (r.dishes?.length || 0), 0),
    [restaurants],
  );

  const pendingTotal = pendingDishes.length;
  const activeNav = useMemo(() => NAV.find((n) => n.id === tab), [tab]);

  const canAccess =
    !!user && (user.role === 'RESTAURANT_OWNER' || user.role === 'ADMIN' || useMockAuth);

  if (!user) {
    return (
      <div className="page-container py-10 text-center">
        <BackButton />
        <Store className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="font-display text-xl font-bold">Owner access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with a restaurant owner account to continue.
        </p>
        <Link
          href="/profile"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Go to Profile
        </Link>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="page-container py-10 text-center">
        <BackButton />
        <p className="py-10 text-muted-foreground">You do not have restaurant owner access.</p>
      </div>
    );
  }

  const approve = async (id: string, edits?: DishApproveEdits) => {
    const priceTrim = edits?.price?.trim();
    const payload = edits
      ? {
          name: edits.name.trim(),
          categoryId: edits.categoryId,
          price: priceTrim ? Number(priceTrim) : null,
          imageUrl: edits.imageUrl.trim() || null,
          restaurantAddress: edits.restaurantAddress.trim() || undefined,
          restaurantCityId: edits.restaurantCityId || undefined,
          restaurantLat: edits.restaurantCoords?.lat,
          restaurantLng: edits.restaurantCoords?.lng,
        }
      : undefined;
    try {
      await api.ownerApproveDish(id, payload);
      setPendingDishes((rows) => rows.filter((d) => d.id !== id));
      setMessage('Dish approved.');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Approve failed');
      throw err;
    }
  };

  const reject = async (id: string) => {
    try {
      await api.ownerRejectDish(id);
      setPendingDishes((rows) => rows.filter((d) => d.id !== id));
      setMessage('Dish rejected.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reject failed');
    }
  };

  return (
    <div className="page-container py-5 md:py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <BackButton fallbackHref="/" />
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-button bg-primary text-primary-foreground">
              <Store className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {user.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Owner workspace · restaurants, inbox, and your account
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingTotal > 0 && (
            <button
              type="button"
              onClick={() => setTab('inbox')}
              className="inline-flex items-center gap-2 rounded-button border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/15"
            >
              <Inbox className="h-4 w-4" aria-hidden="true" />
              {pendingTotal} awaiting review
            </button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              logout();
              router.replace('/');
            }}
          >
            <LogOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Sign Out
          </Button>
        </div>
      </div>

      {message && (
        <p className="mb-4 text-sm text-primary" role="status">
          {message}
        </p>
      )}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-5 rounded-card border border-border bg-surface p-3">
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Daily work
              </p>
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.group === 'work').map((item) => (
                  <li key={item.id}>
                    <NavButton
                      item={item}
                      active={tab === item.id}
                      badge={item.id === 'inbox' ? pendingTotal : undefined}
                      onClick={() => setTab(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                You
              </p>
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.group === 'you').map((item) => (
                  <li key={item.id}>
                    <NavButton
                      item={item}
                      active={tab === item.id}
                      onClick={() => setTab(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </aside>

        <div className="lg:hidden -mx-4 px-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 snap-scroll-x">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'snap-item relative inline-flex shrink-0 items-center gap-1.5 rounded-button border px-3 py-2 text-xs font-semibold transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-surface text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                  {item.id === 'inbox' && pendingTotal > 0 && (
                    <span
                      className={cn(
                        'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                        active ? 'bg-white/20' : 'bg-primary text-primary-foreground',
                      )}
                    >
                      {pendingTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-5 hidden sm:block">
            <h2 className="font-display text-xl font-bold tracking-tight">{activeNav?.label}</h2>
            <p className="text-sm text-muted-foreground">{activeNav?.hint}</p>
          </div>

          {tab === 'overview' && (
            <OverviewPanel
              pendingDishes={pendingTotal}
              restaurantCount={restaurants.length}
              dishCount={dishCount}
              loading={loading}
              onGo={setTab}
            />
          )}

          {tab === 'inbox' && (
            <InboxPanel
              dishes={pendingDishes}
              loading={loading}
              onApprove={approve}
              onReject={reject}
              onRefresh={load}
            />
          )}

          {tab === 'catalog' && (
            <OwnerCatalogManager
              restaurants={restaurants}
              onRestaurantsChange={setRestaurants}
            />
          )}

          {tab === 'reviews' && <ProfileReviewsPanel />}
          {tab === 'saved' && <ProfileSavedPanel />}
          {tab === 'account' && <ProfileAccountPanel showSignOut={false} />}
        </div>
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  badge,
  onClick,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-button px-2.5 py-2 text-left transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{item.label}</span>
        <span
          className={cn(
            'block truncate text-[11px]',
            active ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          {item.hint}
        </span>
      </span>
      {!!badge && badge > 0 && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
            active ? 'bg-white/20' : 'bg-primary text-primary-foreground',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function OverviewPanel({
  pendingDishes,
  restaurantCount,
  dishCount,
  loading,
  onGo,
}: {
  pendingDishes: number;
  restaurantCount: number;
  dishCount: number;
  loading: boolean;
  onGo: (tab: OwnerTab) => void;
}) {
  const cards = [
    {
      label: 'Inbox',
      value: pendingDishes,
      detail: 'Dishes waiting for your approval',
      tab: 'inbox' as const,
      tone: pendingDishes > 0 ? 'bg-primary/10 border-primary/25' : 'bg-surface border-border',
    },
    {
      label: 'Restaurants',
      value: restaurantCount,
      detail: `${dishCount} dish${dishCount === 1 ? '' : 'es'} across your venues`,
      tab: 'catalog' as const,
      tone: 'bg-surface border-border',
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-card bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onGo(c.tab)}
            className={cn(
              'rounded-card border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm',
              c.tone,
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {c.label}
            </p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
          </button>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Quick actions</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              tab: 'inbox' as const,
              title: 'Clear the inbox',
              desc: 'Approve or reject dish submissions',
            },
            {
              tab: 'catalog' as const,
              title: 'Update pictures',
              desc: 'Refresh restaurant and dish photos',
            },
            {
              tab: 'catalog' as const,
              title: 'Fix categories',
              desc: 'Correct dish types so search stays clean',
            },
            {
              tab: 'account' as const,
              title: 'Account settings',
              desc: 'Edit your name, email, and phone',
            },
          ].map((a) => (
            <button
              key={a.title}
              type="button"
              onClick={() => onGo(a.tab)}
              className="rounded-card border border-border bg-surface p-3.5 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
            >
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InboxPanel({
  dishes,
  loading,
  onApprove,
  onReject,
  onRefresh,
}: {
  dishes: Dish[];
  loading: boolean;
  onApprove: (id: string, edits?: DishApproveEdits) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
  onRefresh: () => void;
}) {
  const [reviewTarget, setReviewTarget] = useState<InboxReviewTarget | null>(null);
  const [acting, setActing] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-muted" />
          ))}
        </div>
      ) : dishes.length === 0 ? (
        <div className="rounded-card border border-dashed border-border py-12 text-center">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium">Inbox is clear</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No pending dishes for your restaurants.
          </p>
        </div>
      ) : (
        <InboxSection title={`Dishes (${dishes.length})`}>
          {dishes.map((d) => (
            <InboxCard
              key={d.id}
              title={d.name}
              subtitle={d.restaurant?.name || 'Unknown restaurant'}
              meta={[d.category, d.restaurant?.city?.name].filter(Boolean).join(' · ')}
              imageUrl={d.imageUrl}
              onReview={() => setReviewTarget({ kind: 'dish', dish: d })}
            />
          ))}
        </InboxSection>
      )}

      <InboxReviewDialog
        open={!!reviewTarget}
        target={reviewTarget}
        busy={acting}
        onOpenChange={(next) => {
          if (!next) setReviewTarget(null);
        }}
        onApproveDish={async (edits) => {
          if (!reviewTarget || reviewTarget.kind !== 'dish') return;
          setActing(true);
          try {
            await onApprove(reviewTarget.dish.id, edits);
          } finally {
            setActing(false);
          }
        }}
        onReject={async () => {
          if (!reviewTarget || reviewTarget.kind !== 'dish') return;
          setActing(true);
          try {
            await onReject(reviewTarget.dish.id);
          } finally {
            setActing(false);
          }
        }}
      />
    </div>
  );
}

function InboxSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 font-display text-base font-bold">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function InboxCard({
  title,
  subtitle,
  meta,
  imageUrl,
  onReview,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  imageUrl?: string | null;
  onReview: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-button border border-border/70 bg-muted">
          <MediaImage src={imageUrl} alt="" fill />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          {meta && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta}</p>}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" onClick={onReview}>
          Review
        </Button>
      </div>
    </div>
  );
}

export default function OwnerPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container py-10">
          <div className="mb-6 h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded-card bg-muted" />
        </div>
      }
    >
      <OwnerPageInner />
    </Suspense>
  );
}
