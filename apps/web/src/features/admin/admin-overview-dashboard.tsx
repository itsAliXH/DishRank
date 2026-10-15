'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminDashboardStats, City } from '@dishrank/shared';
import {
  Bookmark,
  Inbox,
  Key,
  MapPin,
  MessageSquareText,
  Store,
  Tags,
  Users,
  Utensils,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AdminFilterToolbar, adminSelectClassName } from '@/features/admin/admin-ui';
import { useAdminLocationFilters, usePruneInvalidAdminCity } from '@/features/admin/use-admin-location-filters';
import { PanelLoading } from '@/components/ui/loading';

type AdminTab =
  | 'overview'
  | 'inbox'
  | 'catalog'
  | 'reviews'
  | 'create'
  | 'cities'
  | 'categories'
  | 'permissions'
  | 'accounts'
  | 'my-reviews'
  | 'saved'
  | 'account';

const COUNTRY_OPTIONS = [{ value: 'Pakistan', label: 'Pakistan' }] as const;
const DEFAULT_COUNTRY = 'Pakistan';

function StatPill({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: number;
  tone?: 'muted' | 'success' | 'warn' | 'danger' | 'primary';
}) {
  const tones = {
    muted: 'bg-muted text-muted-foreground',
    success: 'bg-success/15 text-success',
    warn: 'bg-amber-500/15 text-amber-700',
    danger: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary',
  };
  return (
    <div className={cn('rounded-button px-2.5 py-1.5', tones[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="font-display text-lg font-bold tabular-nums leading-tight">{value}</p>
    </div>
  );
}

function StatCard({
  title,
  icon: Icon,
  total,
  children,
  onClick,
}: {
  title: string;
  icon: typeof Store;
  total: number;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'surface-card p-4 text-left',
        onClick && 'surface-card-interactive cursor-pointer',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-0.5 font-display text-3xl font-bold tabular-nums">{total}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3">{children}</div>
    </Wrapper>
  );
}

export function AdminOverviewDashboard({
  onGo,
}: {
  onGo: (tab: AdminTab) => void;
}) {
  const [cities, setCities] = useState<City[]>([]);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    countryFilter,
    provinceFilter,
    cityFilter,
    setCountryFilter,
    setProvinceFilter,
    setCityFilter,
  } = useAdminLocationFilters();

  const provinces = useMemo(() => {
    const set = new Set(cities.map((c) => c.province).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [cities]);

  const citiesForFilter = useMemo(() => {
    return cities
      .filter((c) => !provinceFilter || c.province === provinceFilter)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cities, provinceFilter]);

  usePruneInvalidAdminCity(cities, citiesForFilter, cityFilter, setCityFilter);

  const loadCities = useCallback(async () => {
    try {
      const list = await api.listAdminCities();
      setCities(list);
    } catch {
      setCities([]);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (countryFilter !== 'Pakistan') {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminStats({
        province: provinceFilter || undefined,
        cityId: cityFilter || undefined,
      });
      setStats(data);
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [countryFilter, provinceFilter, cityFilter]);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const scopeLabel = useMemo(() => {
    const parts = [countryFilter || 'All countries'];
    if (provinceFilter) parts.push(provinceFilter);
    if (cityFilter) {
      parts.push(cities.find((c) => c.id === cityFilter)?.name || 'City');
    }
    return parts.join(' · ');
  }, [countryFilter, provinceFilter, cityFilter, cities]);

  return (
    <div className="space-y-5">
      <AdminFilterToolbar>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className={adminSelectClassName}
            aria-label="Filter by country"
          >
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className={adminSelectClassName}
            aria-label="Filter by province"
          >
            <option value="">All provinces</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className={adminSelectClassName}
            aria-label="Filter by city"
          >
            <option value="">All cities</option>
            {citiesForFilter.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <p className="px-0.5 text-xs text-muted-foreground">
          Scope: <span className="font-medium text-foreground">{scopeLabel}</span>
          {stats?.users ? ' · Users are platform-wide' : ''}
        </p>
      </AdminFilterToolbar>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <PanelLoading
          label="Loading stats…"
          hint="Aggregating restaurants, dishes, and more"
          rows={4}
          rowHeight="h-32"
        />
      ) : countryFilter !== 'Pakistan' ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No data for this country yet.
        </p>
      ) : !stats ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Could not load dashboard stats.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              title="Restaurants"
              icon={Store}
              total={stats.restaurants.total}
              onClick={() => onGo('catalog')}
            >
              <StatPill label="Active" value={stats.restaurants.active} tone="success" />
              <StatPill label="Inactive" value={stats.restaurants.inactive} tone="warn" />
              <StatPill label="Banned" value={stats.restaurants.banned} tone="danger" />
            </StatCard>

            <StatCard
              title="Dishes"
              icon={Utensils}
              total={stats.dishes.total}
              onClick={() => onGo('catalog')}
            >
              <StatPill label="Active" value={stats.dishes.active} tone="success" />
              <StatPill label="Inactive" value={stats.dishes.inactive} tone="warn" />
              <StatPill label="Banned" value={stats.dishes.banned} tone="danger" />
            </StatCard>

            <StatCard
              title="Reviews"
              icon={MessageSquareText}
              total={stats.reviews.total}
              onClick={() => onGo('reviews')}
            >
              <StatPill label="Verified" value={stats.reviews.verified} tone="success" />
              <StatPill label="Unverified" value={stats.reviews.unverified} tone="muted" />
              <StatPill label="Hidden" value={stats.reviews.hidden} tone="warn" />
            </StatCard>

            <StatCard
              title="Inbox"
              icon={Inbox}
              total={stats.inbox.total}
              onClick={() => onGo('inbox')}
            >
              <StatPill label="Restaurants" value={stats.inbox.restaurants} tone="primary" />
              <StatPill label="Dishes" value={stats.inbox.dishes} tone="primary" />
              <StatPill label="Reviews" value={stats.inbox.reviews} tone="primary" />
            </StatCard>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="surface-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Restaurant ownership
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatPill label="With owner" value={stats.restaurants.withOwner} tone="success" />
                <StatPill label="No owner" value={stats.restaurants.withoutOwner} tone="warn" />
              </div>
              <button
                type="button"
                onClick={() => onGo('catalog')}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                Assign owners in Catalog →
              </button>
            </div>

            <div className="surface-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Receipt verify
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatPill label="Enabled" value={stats.restaurants.receiptVerifyOn} tone="success" />
                <StatPill label="Disabled" value={stats.restaurants.receiptVerifyOff} tone="muted" />
              </div>
              <button
                type="button"
                onClick={() => onGo('permissions')}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                Manage in Permissions →
              </button>
            </div>

            <div className="surface-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cities in scope
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatPill label="Enabled" value={stats.cities.active} tone="success" />
                <StatPill label="Disabled" value={stats.cities.inactive} tone="muted" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.cities.total} total
              </p>
              <button
                type="button"
                onClick={() => onGo('cities')}
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                Manage cities →
              </button>
            </div>
          </div>

          <div className="surface-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Users (platform-wide)
              </p>
              <button
                type="button"
                onClick={() => onGo('accounts')}
                className="text-xs font-medium text-primary hover:underline"
              >
                Accounts →
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <StatPill label="Total" value={stats.users.total} tone="primary" />
              <StatPill label="Active" value={stats.users.active} tone="success" />
              <StatPill label="Deactivated" value={stats.users.deactivated} tone="warn" />
              <StatPill label="Banned" value={stats.users.banned} tone="danger" />
              <StatPill label="Owners" value={stats.users.owners} tone="muted" />
            </div>
          </div>
        </>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Quick actions</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { tab: 'inbox' as const, title: 'Clear the inbox', desc: 'Approve or reject submissions', icon: Inbox },
            { tab: 'create' as const, title: 'Create a listing', desc: 'Add restaurant or dish live', icon: Store },
            { tab: 'catalog' as const, title: 'Edit catalog', desc: 'Hide, ban, assign owners', icon: Utensils },
            { tab: 'reviews' as const, title: 'Review moderation', desc: 'Search and soft-hide reviews', icon: MessageSquareText },
            { tab: 'permissions' as const, title: 'Permissions', desc: 'Receipt verify and more', icon: Key },
            { tab: 'categories' as const, title: 'Fix categories', desc: 'Rename or add dish types', icon: Tags },
            { tab: 'cities' as const, title: 'Manage cities', desc: 'Enable or disable locations', icon: MapPin },
            { tab: 'accounts' as const, title: 'User accounts', desc: 'Owners, bans, passwords', icon: Users },
            { tab: 'saved' as const, title: 'Your bookmarks', desc: 'Dishes you saved', icon: Bookmark },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.tab + a.title}
                type="button"
                onClick={() => onGo(a.tab)}
                className="flex items-start gap-3 rounded-card border border-border bg-surface p-3.5 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
