'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { City, ContentStatus, Restaurant, User } from '@dishrank/shared';
import { Eye, MessageSquare, Search, Shield, UtensilsCrossed } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AdminFilterToolbar, adminSelectClassName } from '@/features/admin/admin-ui';
import { useAdminLocationFilters, usePruneInvalidAdminCity } from '@/features/admin/use-admin-location-filters';
import { PanelLoading } from '@/components/ui/loading';

type PermissionRow = Pick<
  Restaurant,
  | 'id'
  | 'name'
  | 'address'
  | 'reviewsEnabled'
  | 'receiptVerifyEnabled'
  | 'allowGeneralReviews'
  | 'requireOnSiteLocation'
  | 'communityDishSubmitEnabled'
  | 'status'
  | 'approvalStatus'
> & {
  city?: Pick<City, 'id' | 'name' | 'province'> | null;
  owner?: Pick<User, 'id' | 'name' | 'email'> | null;
  _count?: { dishes: number };
};

/** App is Pakistan-first; other countries reserved for later expansion. */
const COUNTRY_OPTIONS = [{ value: 'Pakistan', label: 'Pakistan' }] as const;

/** UI labels — DB enum stays ACTIVE | HIDDEN | BLOCKED. */
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
    hint: 'Enforcement hold — policy violation',
  },
];

function statusBadgeClass(status?: string) {
  if (status === 'ACTIVE') return 'bg-success/10 text-success';
  if (status === 'HIDDEN') return 'bg-amber-500/15 text-amber-700';
  if (status === 'BLOCKED') return 'bg-destructive/10 text-destructive';
  return 'bg-muted text-muted-foreground';
}

function statusLabel(status?: string) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'Active';
}

function RadioOption({
  name,
  value,
  checked,
  disabled,
  label,
  description,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  description?: string;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-button px-2 py-1.5 transition-colors',
        disabled && 'cursor-not-allowed',
        checked ? 'bg-primary/5' : 'bg-transparent',
      )}
    >
      <input
        type="radio"
        className="mt-1 h-4 w-4 accent-primary"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function AdminPermissionsManager() {
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const {
    countryFilter,
    provinceFilter,
    cityFilter,
    setCountryFilter,
    setProvinceFilter,
    setCityFilter,
  } = useAdminLocationFilters();
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContentStatus>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, cityList] = await Promise.all([
        api.listAdminPermissions(),
        api.listAdminCities(),
      ]);
      setRows(data as PermissionRow[]);
      setCities(cityList);
    } catch {
      setRows([]);
      setCities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (countryFilter !== 'Pakistan') return [];

    return rows.filter((r) => {
      const statusOk = statusFilter === 'ALL' || (r.status || 'ACTIVE') === statusFilter;
      const provinceOk = !provinceFilter || r.city?.province === provinceFilter;
      const cityOk = !cityFilter || r.city?.id === cityFilter;
      if (!statusOk || !provinceOk || !cityOk) return false;

      if (!query) return true;

      const hay = [
        r.name,
        r.address,
        r.city?.name,
        r.city?.province,
        r.owner?.name,
        r.owner?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [rows, query, statusFilter, countryFilter, provinceFilter, cityFilter]);

  const patchRow = (
    id: string,
    patch: Partial<
      Pick<
        PermissionRow,
        | 'reviewsEnabled'
        | 'receiptVerifyEnabled'
        | 'allowGeneralReviews'
        | 'requireOnSiteLocation'
        | 'communityDishSubmitEnabled'
      >
    >,
  ) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const savePermissions = async (
    row: PermissionRow,
    data: Partial<{
      reviewsEnabled: boolean;
      receiptVerifyEnabled: boolean;
      allowGeneralReviews: boolean;
      requireOnSiteLocation: boolean;
      communityDishSubmitEnabled: boolean;
    }>,
    successMessage: string,
  ) => {
    const next = {
      reviewsEnabled:
        data.reviewsEnabled !== undefined ? data.reviewsEnabled : row.reviewsEnabled !== false,
      receiptVerifyEnabled:
        data.receiptVerifyEnabled !== undefined
          ? data.receiptVerifyEnabled
          : row.receiptVerifyEnabled !== false,
      allowGeneralReviews:
        data.allowGeneralReviews !== undefined
          ? data.allowGeneralReviews
          : row.allowGeneralReviews !== false,
      requireOnSiteLocation:
        data.requireOnSiteLocation !== undefined
          ? data.requireOnSiteLocation
          : row.requireOnSiteLocation !== false,
      communityDishSubmitEnabled:
        data.communityDishSubmitEnabled !== undefined
          ? data.communityDishSubmitEnabled
          : row.communityDishSubmitEnabled !== false,
    };

    // Already in this state — ignore re-click on the selected radio.
    if (
      next.reviewsEnabled === (row.reviewsEnabled !== false) &&
      next.receiptVerifyEnabled === (row.receiptVerifyEnabled !== false) &&
      next.allowGeneralReviews === (row.allowGeneralReviews !== false) &&
      next.requireOnSiteLocation === (row.requireOnSiteLocation !== false) &&
      next.communityDishSubmitEnabled === (row.communityDishSubmitEnabled !== false)
    ) {
      return;
    }

    const previous = {
      reviewsEnabled: row.reviewsEnabled,
      receiptVerifyEnabled: row.receiptVerifyEnabled,
      allowGeneralReviews: row.allowGeneralReviews,
      requireOnSiteLocation: row.requireOnSiteLocation,
      communityDishSubmitEnabled: row.communityDishSubmitEnabled,
    };

    // Optimistic UI — update immediately so radios don’t flash while waiting on the API.
    patchRow(row.id, next);
    setMessage(null);

    try {
      const updated = await api.updateAdminRestaurantPermissions(row.id, data);
      patchRow(row.id, {
        reviewsEnabled: updated.reviewsEnabled,
        receiptVerifyEnabled: updated.receiptVerifyEnabled,
        allowGeneralReviews: updated.allowGeneralReviews,
        requireOnSiteLocation: updated.requireOnSiteLocation,
        communityDishSubmitEnabled: updated.communityDishSubmitEnabled,
      });
      setMessage(successMessage);
    } catch (err) {
      patchRow(row.id, previous);
      setMessage(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const updateListingStatus = async (row: PermissionRow, status: ContentStatus) => {
    if ((row.status || 'ACTIVE') === status) return;
    setBusyId(row.id);
    setMessage(null);
    try {
      await api.setRestaurantStatus(row.id, status);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
      setMessage(`“${row.name}” set to ${statusLabel(status)}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <PanelLoading
        label="Loading permissions…"
        hint="Fetching restaurant flags"
        rows={4}
        rowHeight="h-24"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="inline-flex items-center gap-2 font-medium text-foreground">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
          Restaurant permissions
        </p>
        <p className="mt-1 text-xs leading-relaxed">
          Allow ratings, then choose Verified (receipt → admin approve) or General-only. Rating and
          written review use the same rules.
        </p>
      </div>

      {message && (
        <p className="text-sm text-primary" role="status">
          {message}
        </p>
      )}

      <AdminFilterToolbar>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants, owner, address…"
            className="pl-9"
            aria-label="Search restaurants for permissions"
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

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length} restaurant{rows.length === 1 ? '' : 's'}
        {countryFilter ? ` · ${countryFilter}` : ''}
        {provinceFilter ? ` · ${provinceFilter}` : ''}
        {cityFilter
          ? ` · ${cities.find((c) => c.id === cityFilter)?.name || 'city'}`
          : ''}
        {statusFilter !== 'ALL'
          ? ` · ${STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label || statusFilter}`
          : ''}
        {query ? ` matching “${search.trim()}”` : ''}
      </p>

      {rows.length === 0 ? (
        <p className="empty-state">No restaurants yet. Add venues in Catalog / Create first.</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No matches.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => {
            const busy = busyId === row.id;
            const listingStatus = (row.status || 'ACTIVE') as ContentStatus;
            const ratingsOn = row.reviewsEnabled !== false;
            const verifiedMode = row.receiptVerifyEnabled !== false;
            const allowGeneral = row.allowGeneralReviews !== false;
            const onSiteRequired = row.requireOnSiteLocation !== false;
            const dishSubmitOn = row.communityDishSubmitEnabled !== false;

            return (
              <li key={row.id} className="surface-card p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-display font-semibold">{row.name}</h3>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        statusBadgeClass(listingStatus),
                      )}
                    >
                      {statusLabel(listingStatus)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.city
                      ? `${row.city.name}${row.city.province ? `, ${row.city.province}` : ''}`
                      : 'City unknown'}{' '}
                    · {row.address}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row._count?.dishes ?? 0} dish{(row._count?.dishes ?? 0) === 1 ? '' : 'es'}
                    {row.owner ? ` · Owner: ${row.owner.name}` : ' · No owner'}
                  </p>
                </div>

                <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                  {/* Listing status */}
                  <div className="flex flex-col gap-2 rounded-button border border-border/70 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Listing status</p>
                        <p className="text-xs leading-snug text-muted-foreground">
                          Active shows in public search. Inactive soft-hides. Banned holds the
                          venue for policy reasons.
                        </p>
                      </div>
                    </div>
                    <select
                      value={listingStatus}
                      disabled={busy}
                      onChange={(e) =>
                        void updateListingStatus(row, e.target.value as ContentStatus)
                      }
                      className="h-9 min-w-[8rem] shrink-0 self-end rounded-button border border-border bg-surface px-2.5 text-sm font-medium sm:self-center"
                      aria-label={`Listing status for ${row.name}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Allow rate/reviews + nested radios */}
                  <div className="rounded-button border border-border/70 bg-muted/20 px-3 py-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
                          <MessageSquare className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">Allow rate / reviews</p>
                          <p className="text-xs leading-snug text-muted-foreground">
                            Same rules for star ratings and written reviews.
                          </p>
                        </div>
                      </div>
                      <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 self-end sm:mt-1 sm:self-start">
                        <span
                          className={cn(
                            'text-xs font-semibold whitespace-nowrap',
                            ratingsOn ? 'text-success' : 'text-muted-foreground',
                          )}
                        >
                          {ratingsOn ? 'On' : 'Off'}
                        </span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={ratingsOn}
                          onChange={(e) =>
                            void savePermissions(
                              row,
                              { reviewsEnabled: e.target.checked },
                              `“${row.name}”: ratings ${e.target.checked ? 'on' : 'off'}.`,
                            )
                          }
                          aria-label={`Allow rate / reviews for ${row.name}`}
                        />
                      </label>
                    </div>

                    {ratingsOn && (
                      <div className="mt-3 space-y-3 border-t border-border/60 pt-3 pl-0 sm:pl-10">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Review type
                        </p>
                        <div className="space-y-1" role="radiogroup" aria-label="Review type">
                          <RadioOption
                            name={`mode-${row.id}`}
                            value="verified"
                            checked={verifiedMode}
                            label="Verified reviews"
                            description="Receipt on-site (~1 km) required for a Verified badge. Admin must approve receipt-backed reviews."
                            onChange={() =>
                              void savePermissions(
                                row,
                                {
                                  receiptVerifyEnabled: true,
                                  allowGeneralReviews: allowGeneral,
                                },
                                `“${row.name}”: Verified reviews mode.`,
                              )
                            }
                          />
                          <RadioOption
                            name={`mode-${row.id}`}
                            value="general"
                            checked={!verifiedMode}
                            label="General reviews"
                            description="No receipt step — all ratings publish as General."
                            onChange={() =>
                              void savePermissions(
                                row,
                                {
                                  receiptVerifyEnabled: false,
                                  allowGeneralReviews: true,
                                },
                                `“${row.name}”: General reviews only.`,
                              )
                            }
                          />
                        </div>

                        {verifiedMode ? (
                          <div className="space-y-1 rounded-button border border-border/60 bg-surface/60 px-2 py-2">
                            <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              When Verified is on
                            </p>
                            <RadioOption
                              name={`policy-${row.id}`}
                              value="both"
                              checked={allowGeneral}
                              label="Enable both General and Verified"
                              description="Rating only → General. Rating + receipt → Verified (pending admin)."
                              onChange={() =>
                                void savePermissions(
                                  row,
                                  { allowGeneralReviews: true },
                                  `“${row.name}”: General + Verified.`,
                                )
                              }
                            />
                            <RadioOption
                              name={`policy-${row.id}`}
                              value="verified-only"
                              checked={!allowGeneral}
                              label="Only Verified"
                              description="Receipt required. Review stays pending until receipt upload + admin approval."
                              onChange={() =>
                                void savePermissions(
                                  row,
                                  { allowGeneralReviews: false },
                                  `“${row.name}”: Verified only.`,
                                )
                              }
                            />
                            <p className="mt-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Location for receipt verify
                            </p>
                            <RadioOption
                              name={`location-${row.id}`}
                              value="onsite"
                              checked={onSiteRequired}
                              label="On location"
                              description="Diner must be within ~1 km of the venue when uploading a receipt."
                              onChange={() =>
                                void savePermissions(
                                  row,
                                  { requireOnSiteLocation: true },
                                  `“${row.name}”: on-location verify.`,
                                )
                              }
                            />
                            <RadioOption
                              name={`location-${row.id}`}
                              value="anywhere"
                              checked={!onSiteRequired}
                              label="From anywhere"
                              description="Receipt can be uploaded without being near the restaurant."
                              onChange={() =>
                                void savePermissions(
                                  row,
                                  { requireOnSiteLocation: false },
                                  `“${row.name}”: verify from anywhere.`,
                                )
                              }
                            />
                          </div>
                        ) : (
                          <div className="rounded-button border border-border/60 bg-surface/60 px-2 py-2">
                            <RadioOption
                              name={`policy-${row.id}`}
                              value="general-locked"
                              checked
                              disabled
                              label="General review / rating"
                              description="Locked on — this mode only supports General reviews."
                              onChange={() => undefined}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Community dish submit */}
                  <div className="flex flex-col gap-2 rounded-button border border-border/70 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
                        <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Community dish submit</p>
                        <p className="text-xs leading-snug text-muted-foreground">
                          On: diners can suggest dishes. Off: staff only.
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 self-end sm:self-center">
                      <span
                        className={cn(
                          'text-xs font-semibold whitespace-nowrap',
                          dishSubmitOn ? 'text-success' : 'text-muted-foreground',
                        )}
                      >
                        {dishSubmitOn ? 'Suggestions on' : 'Staff only'}
                      </span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={dishSubmitOn}
                        onChange={(e) =>
                          void savePermissions(
                            row,
                            { communityDishSubmitEnabled: e.target.checked },
                            `“${row.name}”: dish suggestions ${e.target.checked ? 'on' : 'off'}.`,
                          )
                        }
                        aria-label={`Community dish submit for ${row.name}`}
                      />
                    </label>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
