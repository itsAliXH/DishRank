'use client';

import { useEffect, useRef, useState } from 'react';
import type { Dish, Restaurant, Review } from '@dishrank/shared';
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Store,
  Utensils,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CategorySelect } from '@/components/shell/category-select';
import { CitySelect } from '@/components/shell/city-select';
import { LocationPicker, type LatLng } from '@/components/shell/location-picker';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { coordsForCity } from '@/lib/city-coords';
import { cn } from '@/lib/utils';

type CityLike = { id?: string; name: string; province?: string | null } | null | undefined;

type PendingRestaurant = Restaurant & {
  dishes?: Dish[];
  _count?: { dishes: number };
  city?: CityLike;
};

export type DishApproveEdits = {
  name: string;
  categoryId: string;
  category: string;
  price: string;
  imageUrl: string;
  restaurantAddress: string;
  restaurantCityId: string;
  restaurantCoords: LatLng | null;
};

export type RestaurantApproveEdits = {
  name: string;
  address: string;
  cityId: string;
  imageUrl: string;
  coords: LatLng | null;
};

function formatFullAddress(address?: string | null, city?: CityLike, country = 'Pakistan') {
  const street = address?.trim() || '';
  const place = [city?.name, city?.province, country].filter(Boolean).join(', ');
  if (street && place) return `${street} · ${place}`;
  return street || place || 'Address unknown';
}

function hasCoords(lat?: number | null, lng?: number | null) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

function CheckRow({
  ok,
  warn,
  label,
  detail,
}: {
  ok: boolean;
  warn?: boolean;
  label: string;
  detail?: string;
}) {
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle;
  return (
    <li
      className={cn(
        'flex items-start gap-2 rounded-button px-2.5 py-2 text-sm',
        ok && 'bg-success/10 text-success',
        !ok && warn && 'bg-amber-50 text-amber-900',
        !ok && !warn && 'bg-destructive/10 text-destructive',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="font-medium">{label}</span>
        {detail ? <span className="mt-0.5 block text-xs opacity-90">{detail}</span> : null}
      </span>
    </li>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </label>
  );
}

function ReadField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value || '—'}</p>
    </div>
  );
}

export type InboxReviewTarget =
  | { kind: 'restaurant'; restaurant: PendingRestaurant }
  | { kind: 'dish'; dish: Dish }
  | { kind: 'review'; review: Review };

export function InboxReviewDialog({
  target,
  open,
  busy,
  onOpenChange,
  onApproveDish,
  onApproveRestaurant,
  onApproveReview,
  onReject,
}: {
  target: InboxReviewTarget | null;
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onApproveDish?: (edits: DishApproveEdits) => void | Promise<void>;
  onApproveRestaurant?: (edits: RestaurantApproveEdits) => void | Promise<void>;
  onApproveReview?: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
}) {
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dishEditsRef = useRef<DishApproveEdits | null>(null);
  const restaurantEditsRef = useRef<RestaurantApproveEdits | null>(null);
  const disabled = busy || acting !== null;

  useEffect(() => {
    if (open) setError(null);
  }, [open, target]);

  const run = async (action: 'approve' | 'reject') => {
    setActing(action);
    setError(null);
    try {
      if (action === 'reject') {
        await onReject();
      } else if (target?.kind === 'dish') {
        const edits = dishEditsRef.current;
        if (!edits?.name.trim()) {
          setError('Dish name is required.');
          return;
        }
        if (!edits.categoryId) {
          setError('Category is required.');
          return;
        }
        if (!edits.restaurantCoords) {
          setError('Set the restaurant map pin before approving.');
          return;
        }
        await onApproveDish?.(edits);
      } else if (target?.kind === 'restaurant') {
        const edits = restaurantEditsRef.current;
        if (!edits?.name.trim() || !edits.address.trim() || !edits.cityId) {
          setError('Name, address, and city are required.');
          return;
        }
        if (!edits.coords) {
          setError('Set the map pin before approving.');
          return;
        }
        await onApproveRestaurant?.(edits);
      } else {
        await onApproveReview?.();
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const title =
    target?.kind === 'restaurant'
      ? 'Review restaurant'
      : target?.kind === 'dish'
        ? 'Review dish'
        : target?.kind === 'review'
          ? 'Review submission'
          : 'Review';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 border-b border-border/80 px-5 py-4 pr-12 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
              {target?.kind === 'dish' ? (
                <Utensils className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Store className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle className="font-display text-lg tracking-tight">{title}</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Edit details and verify the map pin before approving.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {target?.kind === 'restaurant' && (
            <RestaurantReviewEditor
              key={target.restaurant.id}
              restaurant={target.restaurant}
              disabled={disabled}
              onChange={(edits) => {
                restaurantEditsRef.current = edits;
              }}
            />
          )}
          {target?.kind === 'dish' && (
            <DishReviewEditor
              key={target.dish.id}
              dish={target.dish}
              disabled={disabled}
              onChange={(edits) => {
                dishEditsRef.current = edits;
              }}
            />
          )}
          {target?.kind === 'review' && <ReviewReviewBody review={target.review} />}
        </div>

        <div className="shrink-0 border-t border-border/80 bg-surface px-5 py-3.5 sm:px-6">
          {error && (
            <p className="mb-2.5 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={disabled}
              onClick={() => void run('reject')}
            >
              {acting === 'reject' ? 'Rejecting…' : 'Reject'}
            </Button>
            <Button type="button" disabled={disabled} onClick={() => void run('approve')}>
              {acting === 'approve' ? 'Saving & approving…' : 'Approve'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DishReviewEditor({
  dish,
  disabled,
  onChange,
}: {
  dish: Dish;
  disabled?: boolean;
  onChange: (edits: DishApproveEdits) => void;
}) {
  const restaurant = dish.restaurant;
  const [name, setName] = useState(dish.name || '');
  const [categoryId, setCategoryId] = useState(dish.categoryId || '');
  const [category, setCategory] = useState(dish.category || '');
  const [price, setPrice] = useState(dish.price != null ? String(dish.price) : '');
  const [imageUrl, setImageUrl] = useState(dish.imageUrl || '');
  const [restaurantAddress, setRestaurantAddress] = useState(restaurant?.address || '');
  const [restaurantCityId, setRestaurantCityId] = useState(
    restaurant?.cityId || restaurant?.city?.id || '',
  );
  const [coords, setCoords] = useState<LatLng | null>(
    hasCoords(restaurant?.lat, restaurant?.lng)
      ? { lat: restaurant!.lat, lng: restaurant!.lng }
      : null,
  );
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current({
      name,
      categoryId,
      category,
      price,
      imageUrl,
      restaurantAddress,
      restaurantCityId,
      restaurantCoords: coords,
    });
  }, [name, categoryId, category, price, imageUrl, restaurantAddress, restaurantCityId, coords]);

  const cityName = restaurant?.city?.name;
  const pinOk = !!coords;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
      <section className="space-y-4">
        <ImagePickerField
          label="Picture"
          value={imageUrl}
          onChange={setImageUrl}
          disabled={disabled}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel>Dish name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled}
              required
              placeholder="Dish name"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Category</FieldLabel>
            <CategorySelect
              valueId={categoryId}
              valueName={category}
              variant="inline"
              disabled={disabled}
              onChange={({ id, name: catName }) => {
                setCategoryId(id);
                setCategory(catName);
              }}
            />
          </div>
          <div>
            <FieldLabel>Price (Rs)</FieldLabel>
            <Input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={disabled}
              placeholder="Optional"
            />
          </div>
          <div>
            <FieldLabel>Restaurant</FieldLabel>
            <Input value={restaurant?.name || ''} disabled readOnly />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Restaurant address</FieldLabel>
            <Input
              value={restaurantAddress}
              onChange={(e) => setRestaurantAddress(e.target.value)}
              disabled={disabled || !restaurant}
              placeholder="Street / area"
            />
          </div>
          {restaurant && (
            <div className="sm:col-span-2">
              <FieldLabel>City</FieldLabel>
              <CitySelect
                allowAll={false}
                value={restaurantCityId}
                onChange={(id) => {
                  if (!id) return;
                  setRestaurantCityId(id);
                }}
              />
            </div>
          )}
        </div>

        <ul className="space-y-1.5" aria-label="Submission checklist">
          <CheckRow ok={Boolean(name.trim())} label="Dish name provided" />
          <CheckRow ok={Boolean(categoryId)} label="Category provided" />
          <CheckRow ok={Boolean(restaurant?.name)} label="Linked restaurant" />
          <CheckRow
            ok={pinOk}
            label="Restaurant map pin"
            detail={
              pinOk
                ? `${coords!.lat.toFixed(5)}, ${coords!.lng.toFixed(5)}`
                : 'Drop a pin before approving.'
            }
          />
          <CheckRow
            ok={Boolean(imageUrl.trim())}
            warn
            label={imageUrl.trim() ? 'Picture attached' : 'Picture missing (optional)'}
          />
        </ul>
      </section>

      <section className="min-w-0 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Restaurant location
        </p>
        {restaurant ? (
          <>
            <LocationPicker
              key={`review-dish-${dish.id}-${restaurantCityId}`}
              value={coords}
              onChange={setCoords}
              defaultCenter={
                coords ||
                coordsForCity(restaurantCityId || 'city-karachi', cityName)
              }
              cityName={cityName}
              compact
            />
            <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              Adjust the pin if it does not match the address.
            </p>
          </>
        ) : (
          <p className="rounded-button border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Restaurant details are missing for this dish.
          </p>
        )}
      </section>
    </div>
  );
}

function RestaurantReviewEditor({
  restaurant,
  disabled,
  onChange,
}: {
  restaurant: PendingRestaurant;
  disabled?: boolean;
  onChange: (edits: RestaurantApproveEdits) => void;
}) {
  const [name, setName] = useState(restaurant.name || '');
  const [address, setAddress] = useState(restaurant.address || '');
  const [cityId, setCityId] = useState(restaurant.cityId || restaurant.city?.id || '');
  const [imageUrl, setImageUrl] = useState(restaurant.imageUrl || '');
  const [coords, setCoords] = useState<LatLng | null>(
    hasCoords(restaurant.lat, restaurant.lng)
      ? { lat: restaurant.lat, lng: restaurant.lng }
      : null,
  );
  const dishes = restaurant.dishes || [];
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current({ name, address, cityId, imageUrl, coords });
  }, [name, address, cityId, imageUrl, coords]);

  const pinOk = !!coords;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
      <section className="space-y-4">
        <ImagePickerField
          label="Picture"
          value={imageUrl}
          onChange={setImageUrl}
          disabled={disabled}
        />

        <div className="grid gap-3">
          <div>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled}
              required
            />
          </div>
          <div>
            <FieldLabel>Address</FieldLabel>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={disabled}
              required
            />
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <CitySelect
              allowAll={false}
              value={cityId}
              onChange={(id) => {
                if (!id) return;
                setCityId(id);
              }}
            />
          </div>
        </div>

        {dishes.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Included dishes ({dishes.length})
            </p>
            <ul className="space-y-1.5">
              {dishes.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 rounded-button border border-border/60 bg-muted/20 px-2.5 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-medium">{d.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {[d.category, d.price != null ? `Rs ${d.price}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="space-y-1.5" aria-label="Submission checklist">
          <CheckRow ok={Boolean(name.trim())} label="Name provided" />
          <CheckRow ok={Boolean(address.trim())} label="Street address provided" />
          <CheckRow ok={Boolean(cityId)} label="City selected" />
          <CheckRow
            ok={pinOk}
            label="Map pin set"
            detail={
              pinOk
                ? `${coords!.lat.toFixed(5)}, ${coords!.lng.toFixed(5)}`
                : 'Near Me and receipt distance checks need a pin.'
            }
          />
          <CheckRow
            ok={Boolean(imageUrl.trim())}
            warn
            label={imageUrl.trim() ? 'Picture attached' : 'Picture missing (optional)'}
          />
        </ul>
      </section>

      <section className="min-w-0 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Location on map
        </p>
        <LocationPicker
          key={`review-rest-${restaurant.id}-${cityId}`}
          value={coords}
          onChange={setCoords}
          defaultCenter={coords || coordsForCity(cityId || 'city-karachi')}
          compact
        />
        <p className="text-xs text-muted-foreground">
          Adjust the pin so it matches the written address before approving.
        </p>
      </section>
    </div>
  );
}

function ReviewReviewBody({ review }: { review: Review }) {
  const restaurant = review.dish?.restaurant as
    | (Restaurant & { city?: CityLike })
    | undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <ReadField label="User" value={review.user?.name || 'User'} />
        <ReadField label="Rating" value={`${review.rating}★`} />
        <ReadField label="Dish" value={review.dish?.name || '—'} />
        <ReadField label="Restaurant" value={restaurant?.name || '—'} />
        <div className="sm:col-span-2">
          <ReadField label="Comment" value={review.text?.trim() || 'No comment'} />
        </div>
        <div className="sm:col-span-2">
          <ReadField
            label="Venue address"
            value={formatFullAddress(restaurant?.address, restaurant?.city)}
          />
        </div>
      </div>
    </div>
  );
}
