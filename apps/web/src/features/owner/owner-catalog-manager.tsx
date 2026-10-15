'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dish, Restaurant } from '@dishrank/shared';
import { ChevronDown, ChevronRight, ImageIcon, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUrlDialog } from '@/features/media/image-url-dialog';
import { MediaImage } from '@/features/dishes/media-image';
import { CategoryFixDialog } from '@/components/shell/category-fix-dialog';
import { EditRestaurantDialog } from '@/features/restaurants/edit-restaurant-dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type OwnedRestaurant = Restaurant & { dishes: Dish[] };

type ImageTarget =
  | { kind: 'restaurant'; restaurant: OwnedRestaurant }
  | { kind: 'dish'; restaurantId: string; dish: Dish };

export function OwnerCatalogManager({
  restaurants: initialRestaurants,
  onRestaurantsChange,
}: {
  restaurants?: OwnedRestaurant[];
  onRestaurantsChange?: (rows: OwnedRestaurant[]) => void;
} = {}) {
  const [restaurants, setRestaurants] = useState<OwnedRestaurant[]>(initialRestaurants || []);
  const [loading, setLoading] = useState(!initialRestaurants);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [categoryTarget, setCategoryTarget] = useState<{
    restaurantId: string;
    dish: Dish;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<OwnedRestaurant | null>(null);

  const sync = useCallback(
    (rows: OwnedRestaurant[]) => {
      setRestaurants(rows);
      onRestaurantsChange?.(rows);
    },
    [onRestaurantsChange],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const owned = await api.getOwnerRestaurants();
      sync(owned);
      setExpanded((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const first = owned[0]?.id;
        return first ? { [first]: true } : {};
      });
    } catch {
      sync([]);
    } finally {
      setLoading(false);
    }
  }, [sync]);

  useEffect(() => {
    if (initialRestaurants) {
      setRestaurants(initialRestaurants);
      setLoading(false);
      return;
    }
    load();
  }, [initialRestaurants, load]);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return restaurants;
    return restaurants.filter((r) => {
      const restMatch =
        r.name.toLowerCase().includes(query) ||
        (r.address || '').toLowerCase().includes(query) ||
        (r.city?.name || '').toLowerCase().includes(query);
      if (restMatch) return true;
      return r.dishes.some(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          (d.category || '').toLowerCase().includes(query),
      );
    });
  }, [restaurants, query]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const saveImage = async (url: string) => {
    if (!imageTarget) return;
    const id =
      imageTarget.kind === 'restaurant' ? imageTarget.restaurant.id : imageTarget.dish.id;
    setBusyId(id);
    setMessage(null);
    try {
      if (imageTarget.kind === 'restaurant') {
        const updated = await api.ownerUpdateRestaurantImage(id, url);
        sync(
          restaurants.map((r) => (r.id === id ? { ...r, imageUrl: updated.imageUrl } : r)),
        );
        setMessage(`Updated picture for “${imageTarget.restaurant.name}”.`);
      } else {
        const updated = await api.ownerUpdateDishImage(id, url);
        sync(
          restaurants.map((r) =>
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
      const updated = await api.updateOwnerDishCategory(dish.id, categoryId);
      sync(
        restaurants.map((r) =>
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
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-card bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Edit restaurant details and pictures, update dish pictures, and fix dish categories.
        Visibility and ownership are managed by DishRank admin.
      </p>

      {message && (
        <p className="text-sm text-primary" role="status">
          {message}
        </p>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your restaurants or dishes…"
          className="pl-9"
          aria-label="Search owned restaurants"
        />
      </div>

      {restaurants.length === 0 ? (
        <div className="rounded-card border border-dashed border-border py-12 text-center">
          <p className="font-medium">No restaurants assigned yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask DishRank admin to assign ownership after your venue contacts the platform.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No restaurants or dishes match your search.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((restaurant) => {
            const isOpen = !!expanded[restaurant.id];
            const busy = busyId === restaurant.id;
            return (
              <div
                key={restaurant.id}
                className="overflow-hidden rounded-card border border-border bg-surface"
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
                      <h3 className="truncate font-semibold">{restaurant.name}</h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {restaurant.city
                          ? `${restaurant.city.name}${restaurant.city.province ? `, ${restaurant.city.province}` : ''}`
                          : 'City unknown'}{' '}
                        · {restaurant.address} · {restaurant.dishes.length} dish
                        {restaurant.dishes.length !== 1 ? 'es' : ''}
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
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3">
                    {restaurant.dishes.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">
                        No dishes listed yet for this restaurant.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {restaurant.dishes.map((dish) => {
                          const dishBusy = busyId === dish.id;
                          const highlight =
                            !!query &&
                            (dish.name.toLowerCase().includes(query) ||
                              (dish.category || '').toLowerCase().includes(query));
                          return (
                            <li
                              key={dish.id}
                              className={cn(
                                'flex flex-col gap-2 rounded-button border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between',
                                highlight && 'ring-1 ring-primary/30',
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-button border border-border bg-muted">
                                  <MediaImage src={dish.imageUrl} alt="" fill />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{dish.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {dish.category}
                                    {dish.price != null ? ` · Rs. ${dish.price}` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={dishBusy}
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
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
        role="owner"
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSaved={(updated) => {
          if (!editTarget) return;
          sync(
            restaurants.map((r) =>
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
        title={categoryTarget ? `Category — ${categoryTarget.dish.name}` : 'Category'}
        currentId={categoryTarget?.dish.categoryId || ''}
        currentName={categoryTarget?.dish.category || ''}
        busy={!!categoryTarget && busyId === categoryTarget.dish.id}
        onSave={saveDishCategory}
      />
    </div>
  );
}
