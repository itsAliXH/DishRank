'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { City, ContentStatus, Dish, Restaurant, User } from '@dishrank/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { ChevronDown, ChevronRight, ImageIcon, Pencil, Plus, Search, Store, Trash2, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminFilterToolbar, adminSelectClassName } from '@/features/admin/admin-ui';
import { useAdminLocationFilters, usePruneInvalidAdminCity } from '@/features/admin/use-admin-location-filters';
import { PanelLoading } from '@/components/ui/loading';
import { ImageUrlDialog } from '@/features/media/image-url-dialog';
import { MediaImage } from '@/features/dishes/media-image';
import { CategoryFixDialog } from '@/components/shell/category-fix-dialog';
import { EditRestaurantDialog } from '@/features/restaurants/edit-restaurant-dialog';

type CatalogOwner = Pick<User, 'id' | 'name' | 'email' | 'role' | 'status'>;

type CatalogRestaurant = Restaurant & {
  dishes: Dish[];
  owner?: CatalogOwner | null;
  city?: City | null;
};

/** App is Pakistan-first; other countries reserved for later expansion. */
const COUNTRY_OPTIONS = [{ value: 'Pakistan', label: 'Pakistan' }] as const;
const DEFAULT_COUNTRY = 'Pakistan';

/** UI labels only — DB enum stays ACTIVE | HIDDEN | BLOCKED for stable APIs & indexing. */
const STATUS_OPTIONS: { value: ContentStatus; label: string; hint: string }[] = [
  {
    value: 'ACTIVE',
    label: 'Active',
    hint: 'Visible in public search',
  },
  {
    value: 'HIDDEN',
    label: 'Inactive',
    hint: 'Soft hide — reversible; kept for owner / admin review',
  },
  {
    value: 'BLOCKED',
    label: 'Banned',
    hint: 'Enforcement hold — policy violation; harder to reverse by design',
  },
];

type PendingDelete =
  | { kind: 'restaurant'; id: string; name: string; dishCount: number }
  | { kind: 'dish'; id: string; restaurantId: string; name: string };

function statusLabel(status?: string) {
  const match = STATUS_OPTIONS.find((o) => o.value === status);
  return match?.label ?? 'Active';
}

function statusBadgeClass(status?: string) {
  if (status === 'ACTIVE') return 'bg-success/10 text-success';
  if (status === 'HIDDEN') return 'bg-muted text-muted-foreground';
  if (status === 'BLOCKED') return 'bg-red-100 text-red-700';
  return 'bg-muted text-muted-foreground';
}

function StatusSelect({
  value,
  disabled,
  ariaLabel,
  onChange,
}: {
  value: ContentStatus;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (status: ContentStatus) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ContentStatus)}
      className="h-9 min-w-[7.5rem] rounded-button border border-border bg-surface px-2.5 text-sm font-medium"
      aria-label={ariaLabel}
      title={STATUS_OPTIONS.find((o) => o.value === value)?.hint}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function DeleteActionButton({
  disabled,
  onClick,
  label = 'Delete',
}: {
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="h-9 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}

export function AdminCatalogManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    countryFilter,
    provinceFilter,
    cityFilter,
    setCountryFilter,
    setProvinceFilter,
    setCityFilter,
  } = useAdminLocationFilters();

  const goCreate = (mode: 'restaurant' | 'dish', restaurantId?: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', 'create');
    sp.set('mode', mode);
    if (restaurantId) sp.set('restaurantId', restaurantId);
    else sp.delete('restaurantId');
    router.push(`/admin?${sp.toString()}`);
  };

  const [catalog, setCatalog] = useState<CatalogRestaurant[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [users, setUsers] = useState<CatalogOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContentStatus>('ALL');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ownerTarget, setOwnerTarget] = useState<CatalogRestaurant | null>(null);
  const [ownerUserId, setOwnerUserId] = useState('');
  const [imageTarget, setImageTarget] = useState<
    | { kind: 'restaurant'; restaurant: CatalogRestaurant }
    | { kind: 'dish'; restaurantId: string; dish: Dish }
    | null
  >(null);
  const [categoryTarget, setCategoryTarget] = useState<{
    restaurantId: string;
    dish: Dish;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<CatalogRestaurant | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [data, userList, cityList] = await Promise.all([
        api.getAdminCatalog(),
        api.listAdminUsers(),
        api.listAdminCities(),
      ]);
      setCatalog(data as CatalogRestaurant[]);
      setCities(cityList);
      setUsers(
        userList
          .filter((u) => u.status !== 'BANNED')
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
          })),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load catalog');
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const provinces = useMemo(() => {
    const set = new Set(cities.map((c) => c.province));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [cities]);

  const citiesForFilter = useMemo(() => {
    return cities
      .filter((c) => !provinceFilter || c.province === provinceFilter)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cities, provinceFilter]);

  usePruneInvalidAdminCity(cities, citiesForFilter, cityFilter, setCityFilter);

  const query = search.trim().toLowerCase();

  const filteredCatalog = useMemo(() => {
    // Country gate: catalog is Pakistan-only today
    if (countryFilter !== 'Pakistan') return [];

    return catalog
      .map((restaurant) => {
        const statusOk =
          statusFilter === 'ALL' || (restaurant.status || 'ACTIVE') === statusFilter;

        const city = restaurant.city;
        const provinceOk = !provinceFilter || city?.province === provinceFilter;
        const cityOk =
          !cityFilter ||
          restaurant.cityId === cityFilter ||
          city?.id === cityFilter;

        if (!statusOk || !provinceOk || !cityOk) return null;

        if (!query) return restaurant;

        const restaurantMatch =
          restaurant.name.toLowerCase().includes(query) ||
          restaurant.address.toLowerCase().includes(query) ||
          (restaurant.owner?.name || '').toLowerCase().includes(query) ||
          (restaurant.owner?.email || '').toLowerCase().includes(query) ||
          (city?.name || '').toLowerCase().includes(query);

        const matchingDishes = restaurant.dishes.filter(
          (d) =>
            d.name.toLowerCase().includes(query) ||
            (d.category || '').toLowerCase().includes(query),
        );

        if (!restaurantMatch && matchingDishes.length === 0) return null;
        return restaurant;
      })
      .filter((r): r is CatalogRestaurant => r != null);
  }, [catalog, query, statusFilter, countryFilter, provinceFilter, cityFilter]);

  const dishMatchIds = useMemo(() => {
    if (!query) return new Set<string>();
    const ids = new Set<string>();
    for (const r of filteredCatalog) {
      const restaurantMatch =
        r.name.toLowerCase().includes(query) ||
        r.address.toLowerCase().includes(query) ||
        (r.owner?.name || '').toLowerCase().includes(query) ||
        (r.owner?.email || '').toLowerCase().includes(query);
      for (const d of r.dishes) {
        const dishMatch =
          d.name.toLowerCase().includes(query) ||
          (d.category || '').toLowerCase().includes(query);
        if (dishMatch && !restaurantMatch) ids.add(r.id);
      }
    }
    return ids;
  }, [filteredCatalog, query]);

  useEffect(() => {
    if (!query) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const id of dishMatchIds) next[id] = true;
      for (const r of filteredCatalog) {
        if (r.name.toLowerCase().includes(query)) next[r.id] = true;
      }
      return next;
    });
  }, [query, dishMatchIds, filteredCatalog]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateRestaurantStatus = async (id: string, status: ContentStatus) => {
    setBusyId(id);
    setMessage(null);
    try {
      await api.setRestaurantStatus(id, status);
      setCatalog((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
      setMessage(`Restaurant set to ${statusLabel(status)}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const updateDishVisibility = async (
    dishId: string,
    restaurantId: string,
    status: ContentStatus,
  ) => {
    setBusyId(dishId);
    setMessage(null);
    try {
      await api.setDishVisibility(dishId, status);
      setCatalog((rows) =>
        rows.map((r) =>
          r.id === restaurantId
            ? {
                ...r,
                dishes: r.dishes.map((d) => (d.id === dishId ? { ...d, visibility: status } : d)),
              }
            : r,
        ),
      );
      setMessage(`Dish set to ${statusLabel(status)}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setMessage(null);
    try {
      if (pendingDelete.kind === 'restaurant') {
        await api.deleteRestaurant(pendingDelete.id);
        setCatalog((rows) => rows.filter((r) => r.id !== pendingDelete.id));
        setMessage(`Deleted restaurant “${pendingDelete.name}”.`);
      } else {
        await api.deleteDish(pendingDelete.id);
        setCatalog((rows) =>
          rows.map((r) =>
            r.id === pendingDelete.restaurantId
              ? { ...r, dishes: r.dishes.filter((d) => d.id !== pendingDelete.id) }
              : r,
          ),
        );
        setMessage(`Deleted dish “${pendingDelete.name}”.`);
      }
      setPendingDelete(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const openOwnerDialog = (restaurant: CatalogRestaurant) => {
    setOwnerTarget(restaurant);
    setOwnerUserId(restaurant.owner?.id || restaurant.claimedBy || '');
  };

  const saveOwner = async () => {
    if (!ownerTarget) return;
    setBusyId(ownerTarget.id);
    setMessage(null);
    try {
      const updated = (await api.assignRestaurantOwner(
        ownerTarget.id,
        ownerUserId || null,
      )) as CatalogRestaurant;
      setCatalog((rows) =>
        rows.map((r) =>
          r.id === ownerTarget.id
            ? { ...r, claimedBy: updated.claimedBy, owner: updated.owner ?? null }
            : r,
        ),
      );
      setMessage(
        updated.owner
          ? `Assigned ${updated.owner.email} as owner of “${ownerTarget.name}”.`
          : `Removed owner from “${ownerTarget.name}”. Listing stays public.`,
      );
      setOwnerTarget(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Owner update failed');
    } finally {
      setBusyId(null);
    }
  };

  const saveImage = async (url: string) => {
    if (!imageTarget) return;
    const id =
      imageTarget.kind === 'restaurant' ? imageTarget.restaurant.id : imageTarget.dish.id;
    setBusyId(id);
    setMessage(null);
    try {
      if (imageTarget.kind === 'restaurant') {
        const updated = await api.updateAdminRestaurantImage(id, url);
        setCatalog((rows) =>
          rows.map((r) => (r.id === id ? { ...r, imageUrl: updated.imageUrl } : r)),
        );
        setMessage(`Updated picture for “${imageTarget.restaurant.name}”.`);
      } else {
        const updated = await api.updateAdminDishImage(id, url);
        setCatalog((rows) =>
          rows.map((r) =>
            r.id === imageTarget.restaurantId
              ? {
                  ...r,
                  dishes: r.dishes.map((d) =>
                    d.id === id ? { ...d, imageUrl: updated.imageUrl } : d,
                  ),
                }
              : r,
          ),
        );
        setMessage(`Updated picture for “${imageTarget.dish.name}”.`);
      }
      setImageTarget(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Image update failed');
    } finally {
      setBusyId(null);
    }
  };

  const saveDishCategory = async (categoryId: string) => {
    if (!categoryTarget) return;
    const { dish, restaurantId } = categoryTarget;
    setBusyId(dish.id);
    setMessage(null);
    try {
      const updated = await api.updateAdminDishCategory(dish.id, categoryId);
      setCatalog((rows) =>
        rows.map((r) =>
          r.id === restaurantId
            ? {
                ...r,
                dishes: r.dishes.map((d) =>
                  d.id === dish.id
                    ? {
                        ...d,
                        categoryId: updated.categoryId,
                        category: updated.category,
                      }
                    : d,
                ),
              }
            : r,
        ),
      );
      setMessage(`Category set to “${updated.category}” for “${dish.name}”.`);
      setCategoryTarget(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Category update failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <PanelLoading
        label="Loading catalog…"
        hint="Fetching restaurants and dishes"
        rows={4}
        rowHeight="h-16"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="rounded-card border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1.5 flex-1 min-w-0">
          <p>
            Expand a restaurant to manage dishes. Status soft-controls visibility; delete removes data
            permanently. Listings stay public with or without an owner.
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-xs">
            <li>
              <span className="font-medium text-foreground">Active / Unlisted / Banned</span> —
              visibility only
            </li>
            <li>
              <span className="font-medium text-foreground">Owner</span> — assign only after the venue
              contacts DishRank. Community submit/review ≠ ownership.
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" size="sm" onClick={() => goCreate('restaurant')}>
            <Store className="h-3.5 w-3.5" aria-hidden="true" />
            Add restaurant
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => goCreate('dish')}>
            <Utensils className="h-3.5 w-3.5" aria-hidden="true" />
            Add dish
          </Button>
        </div>
      </div>

      {message && (
        <p className="text-sm text-primary" role="status">
          {message}
        </p>
      )}

      <AdminFilterToolbar>
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants, dishes, owner, address…"
            className="pl-9"
            aria-label="Search catalog"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ContentStatus)}
            className={adminSelectClassName}
            aria-label="Filter by restaurant status"
          >
            <option value="ALL">All statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </AdminFilterToolbar>

      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredCatalog.length} of {catalog.length} restaurant
          {catalog.length !== 1 ? 's' : ''}
          {countryFilter ? ` · ${countryFilter}` : ''}
          {provinceFilter ? ` · ${provinceFilter}` : ''}
          {cityFilter
            ? ` · ${cities.find((c) => c.id === cityFilter)?.name || 'city'}`
            : ''}
          {query ? ` matching “${search.trim()}”` : ''}
        </p>
      )}

      {catalog.length === 0 ? (
        <div className="rounded-card border border-dashed border-border px-4 py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No restaurants registered yet.</p>
          <Button type="button" size="sm" onClick={() => goCreate('restaurant')}>
            <Store className="h-3.5 w-3.5" aria-hidden="true" />
            Add restaurant
          </Button>
        </div>
      ) : filteredCatalog.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No restaurants or dishes match your search.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredCatalog.map((restaurant) => {
            const isOpen = !!expanded[restaurant.id];
            const busy = busyId === restaurant.id;
            const highlightDish = (d: Dish) =>
              !!query &&
              (d.name.toLowerCase().includes(query) ||
                (d.category || '').toLowerCase().includes(query));
            return (
              <div
                key={restaurant.id}
                className="rounded-card border border-border bg-surface overflow-hidden"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => toggleExpand(restaurant.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-button border border-border bg-muted">
                      <MediaImage src={restaurant.imageUrl} alt="" fill />
                    </div>
                    {isOpen ? (
                      <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{restaurant.name}</h3>
                        {restaurant.approvalStatus && restaurant.approvalStatus !== 'APPROVED' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                            {restaurant.approvalStatus === 'PENDING' ? 'Pending approval' : 'Rejected'}
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            statusBadgeClass(restaurant.status),
                          )}
                        >
                          {statusLabel(restaurant.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {restaurant.city
                          ? `${restaurant.city.name}, ${restaurant.city.province}`
                          : 'City unknown'}{' '}
                        · {restaurant.address} · {restaurant.dishes.length} dish
                        {restaurant.dishes.length !== 1 ? 'es' : ''}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {restaurant.owner
                          ? `Owner: ${restaurant.owner.name} (${restaurant.owner.email})`
                          : 'Owner: none — still public for reviews'}
                      </p>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="h-9"
                      onClick={() => setEditTarget(restaurant)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="h-9"
                      onClick={() => setImageTarget({ kind: 'restaurant', restaurant })}
                    >
                      <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      Picture
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="h-9"
                      onClick={() => openOwnerDialog(restaurant)}
                    >
                      {restaurant.owner ? 'Change owner' : 'Assign owner'}
                    </Button>
                    <StatusSelect
                      value={(restaurant.status as ContentStatus) || 'ACTIVE'}
                      disabled={busy}
                      ariaLabel={`Status for ${restaurant.name}`}
                      onChange={(status) => updateRestaurantStatus(restaurant.id, status)}
                    />
                    <DeleteActionButton
                      disabled={busy}
                      onClick={() =>
                        setPendingDelete({
                          kind: 'restaurant',
                          id: restaurant.id,
                          name: restaurant.name,
                          dishCount: restaurant.dishes.length,
                        })
                      }
                    />
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-3">
                    {restaurant.dishes.length === 0 ? (
                      <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                          No dishes for this restaurant yet.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => goCreate('dish', restaurant.id)}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add dish
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {restaurant.dishes.map((dish) => {
                          const dishBusy = busyId === dish.id;
                          const matched = highlightDish(dish);
                          return (
                            <div
                              key={dish.id}
                              className={cn(
                                'flex flex-col gap-2 rounded-button border bg-surface p-3 sm:flex-row sm:items-center',
                                matched
                                  ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                                  : 'border-border',
                              )}
                            >
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-button border border-border bg-muted">
                                <MediaImage src={dish.imageUrl} alt="" fill />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-medium">{dish.name}</p>
                                  <span
                                    className={cn(
                                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                      statusBadgeClass(dish.visibility),
                                    )}
                                  >
                                    {statusLabel(dish.visibility)}
                                  </span>
                                  {dish.status && dish.status !== 'APPROVED' && (
                                    <span className="text-[10px] font-medium text-muted-foreground">
                                      approval: {dish.status}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {dish.category}
                                  {dish.price != null ? ` · Rs. ${dish.price}` : ''}
                                  {` · ${dish.avgRating.toFixed(1)}★ (${dish.reviewCount})`}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={dishBusy}
                                  className="h-9"
                                  onClick={() =>
                                    setCategoryTarget({
                                      restaurantId: restaurant.id,
                                      dish,
                                    })
                                  }
                                >
                                  Category
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={dishBusy}
                                  className="h-9"
                                  onClick={() =>
                                    setImageTarget({
                                      kind: 'dish',
                                      restaurantId: restaurant.id,
                                      dish,
                                    })
                                  }
                                >
                                  <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                  Picture
                                </Button>
                                <StatusSelect
                                  value={(dish.visibility as ContentStatus) || 'ACTIVE'}
                                  disabled={dishBusy}
                                  ariaLabel={`Status for ${dish.name}`}
                                  onChange={(status) =>
                                    updateDishVisibility(dish.id, restaurant.id, status)
                                  }
                                />
                                <DeleteActionButton
                                  disabled={dishBusy}
                                  onClick={() =>
                                    setPendingDelete({
                                      kind: 'dish',
                                      id: dish.id,
                                      restaurantId: restaurant.id,
                                      name: dish.name,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {restaurant.dishes.length > 0 && (
                      <div className="pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => goCreate('dish', restaurant.id)}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add dish to {restaurant.name}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingDelete?.kind === 'restaurant'
                ? 'Delete restaurant?'
                : 'Delete dish?'}
            </DialogTitle>
          </DialogHeader>

          {pendingDelete && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You’re about to permanently delete{' '}
                <span className="font-semibold text-foreground">
                  “{pendingDelete.name}”
                </span>
                {pendingDelete.kind === 'restaurant' && pendingDelete.dishCount > 0
                  ? ` and its ${pendingDelete.dishCount} dish${
                      pendingDelete.dishCount !== 1 ? 'es' : ''
                    }`
                  : ''}
                .
              </p>
              <div className="rounded-button border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {pendingDelete.kind === 'restaurant' ? (
                  <>
                    This cannot be undone. All dishes and their reviews under this restaurant will
                    be removed. Prefer <strong>Banned</strong> or <strong>Unlisted</strong> if you
                    only need to hide it from search.
                  </>
                ) : (
                  <>
                    This cannot be undone. Reviews for this dish will be removed. Prefer{' '}
                    <strong>Banned</strong> or <strong>Unlisted</strong> if you only need to hide it
                    from search.
                  </>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleting}
                  onClick={() => setPendingDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleting}
                  onClick={confirmDelete}
                >
                  {deleting ? 'Deleting…' : 'Delete permanently'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!ownerTarget}
        onOpenChange={(open) => {
          if (!open) setOwnerTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign restaurant owner</DialogTitle>
          </DialogHeader>
          {ownerTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Assign an account as the restaurant admin for{' '}
                <strong>{ownerTarget.name}</strong>. Only do this after the venue contacts
                DishRank. Without an owner the listing stays public and people can still review.
              </p>
              <div>
                <label className="text-sm font-medium mb-1 block">Account</label>
                <select
                  value={ownerUserId}
                  onChange={(e) => setOwnerUserId(e.target.value)}
                  className="flex h-11 w-full rounded-button border border-border bg-surface px-3 text-sm"
                >
                  <option value="">No owner (unclaimed)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.email} ({u.role})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a new login under Accounts if they don’t have one yet, then assign here.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOwnerTarget(null)}>
                  Cancel
                </Button>
                <Button onClick={saveOwner} disabled={busyId === ownerTarget.id}>
                  Save owner
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImageUrlDialog
        open={!!imageTarget}
        onOpenChange={(open) => {
          if (!open) setImageTarget(null);
        }}
        title={
          imageTarget?.kind === 'restaurant'
            ? `Restaurant picture — ${imageTarget.restaurant.name}`
            : imageTarget?.kind === 'dish'
              ? `Dish picture — ${imageTarget.dish.name}`
              : 'Picture'
        }
        currentUrl={
          imageTarget?.kind === 'restaurant'
            ? imageTarget.restaurant.imageUrl
            : imageTarget?.kind === 'dish'
              ? imageTarget.dish.imageUrl
              : ''
        }
        busy={
          !!imageTarget &&
          busyId ===
            (imageTarget.kind === 'restaurant'
              ? imageTarget.restaurant.id
              : imageTarget.dish.id)
        }
        onSave={saveImage}
      />

      <EditRestaurantDialog
        open={!!editTarget}
        restaurant={editTarget}
        role="admin"
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSaved={(updated) => {
          if (!editTarget) return;
          setCatalog((rows) =>
            rows.map((r) =>
              r.id === editTarget.id
                ? {
                    ...r,
                    name: updated.name,
                    address: updated.address,
                    cityId: updated.cityId,
                    city: updated.city ?? r.city,
                    lat: updated.lat,
                    lng: updated.lng,
                    imageUrl: updated.imageUrl,
                  }
                : r,
            ),
          );
          setMessage(`Updated “${updated.name}”.`);
          setEditTarget(null);
        }}
      />

      <CategoryFixDialog
        open={!!categoryTarget}
        onOpenChange={(open) => {
          if (!open) setCategoryTarget(null);
        }}
        title={
          categoryTarget
            ? `Category — ${categoryTarget.dish.name}`
            : 'Category'
        }
        currentId={categoryTarget?.dish.categoryId || ''}
        currentName={categoryTarget?.dish.category || ''}
        busy={!!categoryTarget && busyId === categoryTarget.dish.id}
        onSave={saveDishCategory}
      />
    </div>
  );
}
