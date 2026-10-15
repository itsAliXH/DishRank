'use client';

import { useEffect, useState } from 'react';
import type { Restaurant } from '@dishrank/shared';
import { MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CitySelect } from '@/components/shell/city-select';
import { LocationPicker, type LatLng } from '@/components/shell/location-picker';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { useCity } from '@/providers/city-context';
import { api } from '@/lib/api';
import { coordsForCity } from '@/lib/city-coords';
import { cn } from '@/lib/utils';

export type RestaurantEditPayload = {
  name: string;
  address: string;
  cityId: string;
  lat: number;
  lng: number;
  imageUrl?: string | null;
};

type EditableRestaurant = Pick<
  Restaurant,
  'id' | 'name' | 'address' | 'cityId' | 'lat' | 'lng' | 'imageUrl'
> & {
  city?: Restaurant['city'];
};

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

export function EditRestaurantDialog({
  open,
  restaurant,
  role,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  restaurant: EditableRestaurant | null;
  role: 'admin' | 'owner';
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: Restaurant) => void;
}) {
  const { cities } = useCity();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cityId, setCityId] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !restaurant) return;
    setName(restaurant.name || '');
    setAddress(restaurant.address || '');
    setCityId(restaurant.cityId || restaurant.city?.id || '');
    setCoords(
      restaurant.lat != null && restaurant.lng != null
        ? { lat: restaurant.lat, lng: restaurant.lng }
        : null,
    );
    setImageUrl(restaurant.imageUrl || '');
    setError(null);
  }, [open, restaurant]);

  const cityName = cities.find((c) => c.id === cityId)?.name;
  const defaultCenter = coordsForCity(cityId || 'city-karachi', cityName);

  const onCityChange = (id: string | null) => {
    if (!id) return;
    const previousCityId = restaurant?.cityId || restaurant?.city?.id;
    setCityId(id);
    if (id !== previousCityId) {
      setCoords(coordsForCity(id, cities.find((c) => c.id === id)?.name));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    if (!name.trim() || !address.trim() || !cityId) {
      setError('Name, address, and city are required.');
      return;
    }
    if (!coords) {
      setError('Pin the location on the map before saving.');
      return;
    }

    const payload: RestaurantEditPayload = {
      name: name.trim(),
      address: address.trim(),
      cityId,
      lat: coords.lat,
      lng: coords.lng,
      imageUrl: imageUrl.trim() || null,
    };

    setSaving(true);
    setError(null);
    try {
      const updated =
        role === 'admin'
          ? await api.updateAdminRestaurant(restaurant.id, payload)
          : await api.ownerUpdateRestaurant(restaurant.id, payload);
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save restaurant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(92vh,880px)] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-full',
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/80 px-5 py-4 pr-12 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
              <Store className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle className="font-display text-lg tracking-tight">
                Edit restaurant
              </DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Details on the left · pin the map on the right
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
              {/* Details */}
              <section className="space-y-4">
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Listing
                  </p>
                  <div className="space-y-3.5">
                    <div>
                      <FieldLabel htmlFor="edit-rest-name">Name</FieldLabel>
                      <Input
                        id="edit-rest-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Restaurant name"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="edit-rest-address">Address</FieldLabel>
                      <Input
                        id="edit-rest-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                        placeholder="Street / area"
                      />
                    </div>
                    <div>
                      <FieldLabel>City</FieldLabel>
                      <CitySelect allowAll={false} value={cityId} onChange={onCityChange} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/70 pt-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Picture
                  </p>
                  <ImagePickerField
                    hideLabel
                    value={imageUrl}
                    onChange={setImageUrl}
                    disabled={saving}
                  />
                </div>

                <div
                  className={cn(
                    'rounded-button border px-3 py-2.5 text-xs',
                    coords
                      ? 'border-secondary/20 bg-secondary-soft/60 text-secondary'
                      : 'border-amber-200 bg-amber-50 text-amber-900',
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {coords
                      ? 'Map pin is set — Near Me will use this spot.'
                      : 'Still need a map pin on the right.'}
                  </span>
                </div>
              </section>

              {/* Map */}
              <section className="min-w-0">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Location
                </p>
                <LocationPicker
                  key={`${restaurant?.id || 'new'}-${cityId}`}
                  value={coords}
                  onChange={setCoords}
                  defaultCenter={defaultCenter}
                  cityName={cityName}
                  searchHint="Search place or street…"
                  compact
                />
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-surface px-5 py-3.5 sm:px-6">
            {error && (
              <p className="mb-2.5 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onOpenChange(false)}
                className="sm:min-w-[6.5rem]"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="sm:min-w-[8.5rem]">
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
