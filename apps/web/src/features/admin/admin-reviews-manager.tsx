'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ApprovalStatus,
  City,
  Dish,
  ReceiptMatchReport,
  Restaurant,
  Review,
  Verification,
} from '@dishrank/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StarRating } from '@/features/reviews/star-rating';
import { VerifiedBadge } from '@/features/reviews/verified-badge';
import { MediaImage } from '@/features/dishes/media-image';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckCircle2, Search, XCircle } from 'lucide-react';
import Link from 'next/link';
import { AdminFilterToolbar, adminSelectClassName } from '@/features/admin/admin-ui';
import { useAdminLocationFilters, usePruneInvalidAdminCity } from '@/features/admin/use-admin-location-filters';
import { PanelLoading, Spinner } from '@/components/ui/loading';

type AdminReview = Review & {
  user?: { id: string; name: string; email?: string };
  dish?: Review['dish'] & {
    restaurant?: Restaurant & { city?: City | null };
  };
  verification?: Verification | null;
};

function ReceiptOcrReport({ verification }: { verification: Verification }) {
  const report = (verification.matchReport || null) as ReceiptMatchReport | null;
  const matched = verification.dishMatched === true;
  const failed = verification.ocrStatus === 'FAILED';
  const pending = verification.ocrStatus === 'PENDING';
  const scorePct =
    verification.matchScore != null ? Math.round(verification.matchScore * 100) : null;

  return (
    <div className="rounded-button border border-border/80 bg-muted/20 p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Receipt verification report
        </p>
        {pending && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            OCR pending
          </span>
        )}
        {failed && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
            OCR failed
          </span>
        )}
        {!pending && !failed && matched && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-success">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Dish found on receipt
          </span>
        )}
        {!pending && !failed && !matched && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
            <XCircle className="h-3 w-3" aria-hidden="true" />
            Dish not found
          </span>
        )}
        {scorePct != null && (
          <span className="text-[11px] text-muted-foreground">Match {scorePct}%</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-button bg-muted sm:aspect-square">
          <MediaImage
            src={verification.receiptImageUrl}
            alt="Uploaded receipt"
            fill
          />
        </div>
        <div className="min-w-0 space-y-2 text-xs">
          {report?.summary && (
            <p className="text-sm text-foreground leading-snug">{report.summary}</p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
            <dt>Rated dish</dt>
            <dd className="text-foreground font-medium">{report?.dishName || '—'}</dd>
            <dt>Restaurant</dt>
            <dd className="text-foreground">{report?.restaurantName || '—'}</dd>
            <dt>On receipt?</dt>
            <dd className="text-foreground">
              {report?.restaurantMentioned ? 'Likely mentioned' : 'Not clearly mentioned'}
            </dd>
            {report?.matchedTokens?.length ? (
              <>
                <dt>Matched words</dt>
                <dd className="text-foreground">{report.matchedTokens.join(', ')}</dd>
              </>
            ) : null}
            {report?.missingTokens?.length ? (
              <>
                <dt>Missing words</dt>
                <dd className="text-foreground">{report.missingTokens.join(', ')}</dd>
              </>
            ) : null}
            {verification.ocrConfidence != null && (
              <>
                <dt>OCR confidence</dt>
                <dd className="text-foreground">
                  {Math.round(verification.ocrConfidence * 100)}%
                </dd>
              </>
            )}
            <dt>GPS</dt>
            <dd className="text-foreground tabular-nums">
              {verification.gpsLat != null && verification.gpsLng != null
                ? `${verification.gpsLat.toFixed(5)}, ${verification.gpsLng.toFixed(5)}`
                : 'Not required / not provided'}
            </dd>
          </dl>
          {(verification.ocrText || report?.ocrPreview) && (
            <details className="rounded-button border border-border/70 bg-surface px-2.5 py-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground">
                Extracted receipt text
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">
                {verification.ocrText || report?.ocrPreview}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

type CatalogRestaurant = Restaurant & {
  dishes: Dish[];
  city?: City | null;
};

function statusLabel(status?: string) {
  if (status === 'REJECTED') return 'Hidden';
  if (status === 'PENDING') return 'Pending';
  return 'Public';
}

function statusBadgeClass(status?: string) {
  if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  if (status === 'PENDING') return 'bg-amber-100 text-amber-800';
  return 'bg-success/10 text-success';
}

export function AdminReviewsManager() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [catalog, setCatalog] = useState<CatalogRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApprovalStatus>('ALL');
  const [verifiedFilter, setVerifiedFilter] = useState<'ALL' | 'true' | 'false'>('ALL');
  const {
    provinceFilter,
    cityFilter,
    setProvinceFilter,
    setCityFilter,
  } = useAdminLocationFilters();
  const [restaurantFilter, setRestaurantFilter] = useState('');
  const [dishFilter, setDishFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cityList, catalogList] = await Promise.all([
          api.listAdminCities(),
          api.getAdminCatalog(),
        ]);
        if (cancelled) return;
        setCities(cityList);
        setCatalog(catalogList as CatalogRestaurant[]);
      } catch {
        if (!cancelled) {
          setCities([]);
          setCatalog([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const restaurantsForFilter = useMemo(() => {
    return catalog
      .filter((r) => {
        if (cityFilter) return r.cityId === cityFilter || r.city?.id === cityFilter;
        if (provinceFilter) return r.city?.province === provinceFilter;
        return true;
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, cityFilter, provinceFilter]);

  const dishesForFilter = useMemo(() => {
    const restaurants = restaurantFilter
      ? restaurantsForFilter.filter((r) => r.id === restaurantFilter)
      : restaurantsForFilter;
    return restaurants
      .flatMap((r) => r.dishes.map((d) => ({ ...d, restaurantName: r.name })))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [restaurantsForFilter, restaurantFilter]);

  usePruneInvalidAdminCity(cities, citiesForFilter, cityFilter, setCityFilter, () => {
    setRestaurantFilter('');
    setDishFilter('');
  });

  useEffect(() => {
    if (restaurantFilter && !restaurantsForFilter.some((r) => r.id === restaurantFilter)) {
      setRestaurantFilter('');
      setDishFilter('');
    }
  }, [restaurantsForFilter, restaurantFilter]);

  useEffect(() => {
    if (dishFilter && !dishesForFilter.some((d) => d.id === dishFilter)) {
      setDishFilter('');
    }
  }, [dishesForFilter, dishFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listAdminReviews({
        q: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        verified: verifiedFilter === 'ALL' ? undefined : verifiedFilter,
        province: provinceFilter || undefined,
        cityId: cityFilter || undefined,
        restaurantId: restaurantFilter || undefined,
        dishId: dishFilter || undefined,
      });
      setReviews(list as AdminReview[]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [
    search,
    statusFilter,
    verifiedFilter,
    provinceFilter,
    cityFilter,
    restaurantFilter,
    dishFilter,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 200);
    return () => clearTimeout(t);
  }, [load]);

  const clearLocationFilters = () => {
    setProvinceFilter('');
    setCityFilter('');
    setRestaurantFilter('');
    setDishFilter('');
  };

  const runAction = async (
    id: string,
    action: 'hide' | 'restore' | 'unverify' | 'approve' | 'reject',
  ) => {
    setBusyId(id);
    setMessage(null);
    try {
      if (action === 'hide') {
        await api.hideAdminReview(id);
        setMessage('Review soft-hidden. It no longer counts toward dish ratings.');
      } else if (action === 'restore') {
        await api.restoreAdminReview(id);
        setMessage('Review restored to public.');
      } else if (action === 'unverify') {
        await api.unverifyAdminReview(id);
        setMessage('Verification removed (bogus claim revoked).');
      } else if (action === 'reject') {
        await api.rejectReview(id);
        setMessage('Receipt rejected — review kept as public General.');
      } else {
        await api.approveReview(id);
        setMessage('Review approved as Verified.');
      }
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="surface-card border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="text-xs leading-relaxed">
          Pending receipt reviews include an OCR report (dish found on receipt or not). Approve to
          mark Verified, or reject the receipt to keep the rating as General. Soft-hide removes a
          review from public pages without deleting history.
        </p>
      </div>

      <AdminFilterToolbar>
        <div className="relative min-w-0">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search text, user, dish, restaurant…"
            className="pl-9"
            aria-label="Search reviews"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={provinceFilter}
            onChange={(e) => {
              setProvinceFilter(e.target.value);
              setRestaurantFilter('');
              setDishFilter('');
            }}
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
            onChange={(e) => {
              setCityFilter(e.target.value);
              setRestaurantFilter('');
              setDishFilter('');
            }}
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
            value={restaurantFilter}
            onChange={(e) => {
              setRestaurantFilter(e.target.value);
              setDishFilter('');
            }}
            className={adminSelectClassName}
            aria-label="Filter by restaurant"
          >
            <option value="">All restaurants</option>
            {restaurantsForFilter.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            value={dishFilter}
            onChange={(e) => setDishFilter(e.target.value)}
            disabled={!restaurantFilter && restaurantsForFilter.length === 0}
            className={adminSelectClassName}
            aria-label="Filter by dish"
          >
            <option value="">All dishes</option>
            {dishesForFilter.map((d) => (
              <option key={d.id} value={d.id}>
                {restaurantFilter ? d.name : `${d.name} · ${d.restaurantName}`}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ApprovalStatus)}
            className={adminSelectClassName}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="APPROVED">Public</option>
            <option value="REJECTED">Hidden</option>
            <option value="PENDING">Pending</option>
          </select>
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value as 'ALL' | 'true' | 'false')}
            className={adminSelectClassName}
            aria-label="Filter by verification"
          >
            <option value="ALL">Verified + unverified</option>
            <option value="true">Verified only</option>
            <option value="false">Unverified only</option>
          </select>
          <div className="col-span-2 sm:col-span-1 flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => void load()} disabled={loading}>
              {loading ? <Spinner size="sm" className="text-muted-foreground" /> : null}
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
            {(provinceFilter || cityFilter || restaurantFilter || dishFilter) && (
              <Button
                type="button"
                variant="ghost"
                className="h-11 shrink-0"
                onClick={clearLocationFilters}
              >
                Clear place
              </Button>
            )}
          </div>
        </div>
      </AdminFilterToolbar>

      {message && (
        <p className="text-sm text-primary" role="status">
          {message}
        </p>
      )}

      {loading ? (
        <PanelLoading
          label="Loading reviews…"
          hint="Searching and filtering ratings"
          rows={4}
          rowHeight="h-24"
        />
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No reviews match.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {reviews.length} review(s)
            {provinceFilter ? ` · ${provinceFilter}` : ''}
            {cityFilter
              ? ` · ${cities.find((c) => c.id === cityFilter)?.name || 'city'}`
              : ''}
            {restaurantFilter
              ? ` · ${catalog.find((r) => r.id === restaurantFilter)?.name || 'restaurant'}`
              : ''}
            {dishFilter
              ? ` · ${dishesForFilter.find((d) => d.id === dishFilter)?.name || 'dish'}`
              : ''}
          </p>
          {reviews.map((r) => {
            const busy = busyId === r.id;
            const status = r.status || 'APPROVED';
            const isHidden = status === 'REJECTED';
            const isPending = status === 'PENDING';
            const city = r.dish?.restaurant?.city;
            return (
              <article
                key={r.id}
                className={cn(
                  'rounded-card border bg-surface p-4 space-y-3',
                  isHidden ? 'border-red-200 bg-red-50/40' : 'border-border',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm truncate">
                        {r.user?.name || 'Unknown'}
                        {r.user?.email ? (
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            · {r.user.email}
                          </span>
                        ) : null}
                      </p>
                      {r.verified && <VerifiedBadge />}
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          statusBadgeClass(status),
                        )}
                      >
                        {statusLabel(status)}
                      </span>
                    </div>
                    <StarRating rating={r.rating} size="sm" />
                    <p className="text-xs text-muted-foreground">
                      {r.dish?.name || 'Dish'}
                      {r.dish?.restaurant?.name ? ` · ${r.dish.restaurant.name}` : ''}
                      {city ? ` · ${city.name}, ${city.province}` : ''}
                      {' · '}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {r.dishId && (
                    <Link
                      href={`/dishes/${r.dishId}`}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      View dish
                    </Link>
                  )}
                </div>

                {r.text ? (
                  <p className="text-sm leading-relaxed">{r.text}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No written review</p>
                )}

                {r.verification && <ReceiptOcrReport verification={r.verification} />}

                <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                  {isPending && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void runAction(r.id, 'approve')}
                      >
                        {r.verification ? 'Approve as Verified' : 'Approve'}
                      </Button>
                      {r.verification && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void runAction(r.id, 'reject')}
                        >
                          Reject receipt → keep General
                        </Button>
                      )}
                    </>
                  )}
                  {!isHidden && !isPending && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => void runAction(r.id, 'hide')}
                    >
                      Soft hide
                    </Button>
                  )}
                  {isHidden && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void runAction(r.id, 'restore')}
                    >
                      Restore
                    </Button>
                  )}
                  {r.verified && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void runAction(r.id, 'unverify')}
                    >
                      Remove verification
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
