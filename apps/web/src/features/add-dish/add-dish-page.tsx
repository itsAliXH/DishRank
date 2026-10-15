'use client';

import { useCallback, useEffect, useState, Suspense, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Restaurant } from '@dishrank/shared';
import Link from 'next/link';
import { CheckCircle2, Plus, Store, Trash2, UtensilsCrossed } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-context';
import { AuthDialog } from '@/features/auth/auth-dialog';
import { CitySelect } from '@/components/shell/city-select';
import { CategorySelect } from '@/components/shell/category-select';
import { RestaurantNameSuggest } from '@/components/shell/restaurant-name-suggest';
import { SignInPrompt } from '@/components/shell/sign-in-prompt';
import {
  FormPageShell,
  FormSection,
  FormSuccess,
  ModeToggle,
} from '@/components/shell/form-page-shell';
import { LocationPicker, type LatLng } from '@/components/shell/location-picker';
import { coordsForCity } from '@/lib/city-coords';
import { useCity } from '@/providers/city-context';

type DishDraft = { name: string; categoryId: string; category: string; price: string };

const emptyDish = (): DishDraft => ({ name: '', categoryId: '', category: '', price: '' });

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-foreground">{children}</label>;
}

function AddDishForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, useMockAuth } = useAuth();
  const { cityId: preferredCityId, cities } = useCity();
  const [authOpen, setAuthOpen] = useState(false);
  const initialMode =
    searchParams.get('mode') === 'restaurant' ? 'restaurant' : 'dish';
  const [mode, setMode] = useState<'dish' | 'restaurant'>(initialMode);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filterCityId, setFilterCityId] = useState<string | null>(null);
  const [name, setName] = useState(searchParams.get('name') || '');
  const [categoryId, setCategoryId] = useState('');
  const [category, setCategory] = useState('');
  const [restaurantId, setRestaurantId] = useState(searchParams.get('restaurantId') || '');
  const [restaurantLabel, setRestaurantLabel] = useState('');
  const restaurantLocked = Boolean(searchParams.get('restaurantId'));
  const [dishRestaurantMode, setDishRestaurantMode] = useState<'existing' | 'new'>('existing');
  const [dishRestName, setDishRestName] = useState('');
  const [dishRestAddress, setDishRestAddress] = useState('');
  const [dishRestCityId, setDishRestCityId] = useState<string | null>(null);
  const [dishRestCoords, setDishRestCoords] = useState<LatLng | null>(null);
  const [price, setPrice] = useState('');

  const [restName, setRestName] = useState(
    searchParams.get('mode') === 'restaurant' ? searchParams.get('name') || '' : '',
  );
  const [restAddress, setRestAddress] = useState('');
  const [restCityId, setRestCityId] = useState<string | null>(null);
  const [restCoords, setRestCoords] = useState<LatLng | null>(null);
  const [citySeeded, setCitySeeded] = useState(false);
  const [dishDrafts, setDishDrafts] = useState<DishDraft[]>([emptyDish()]);
  const [existingMatch, setExistingMatch] = useState<Restaurant | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [submitKind, setSubmitKind] = useState<'dish' | 'restaurant' | 'dish-with-restaurant'>(
    'dish',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = searchParams.get('mode') === 'restaurant' ? 'restaurant' : 'dish';
    setMode(next);
    const prefill = searchParams.get('name') || '';
    if (next === 'dish') setName(prefill);
    if (next === 'restaurant') setRestName(prefill);
    const rid = searchParams.get('restaurantId') || '';
    if (rid) {
      setRestaurantId(rid);
      setDishRestaurantMode('existing');
    }
  }, [searchParams]);

  useEffect(() => {
    if (citySeeded || !preferredCityId) return;
    setFilterCityId(preferredCityId);
    setDishRestCityId(preferredCityId);
    setRestCityId(preferredCityId);
    setCitySeeded(true);
  }, [preferredCityId, citySeeded]);

  const [suggestBlocked, setSuggestBlocked] = useState(false);

  // Resolve label when restaurantId comes from URL; block if community submit is off
  useEffect(() => {
    if (!restaurantId || useMockAuth) {
      setSuggestBlocked(false);
      return;
    }
    const found = restaurants.find((r) => r.id === restaurantId);
    if (found) {
      setRestaurantLabel([found.name, found.city?.name].filter(Boolean).join(' · '));
      setSuggestBlocked(found.communityDishSubmitEnabled === false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await api.getRestaurant(restaurantId);
        if (cancelled) return;
        setRestaurantLabel([r.name, r.city?.name].filter(Boolean).join(' · '));
        setSuggestBlocked(r.communityDishSubmitEnabled === false);
      } catch {
        /* keep empty until list loads */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, restaurants, useMockAuth]);

  const loadRestaurants = useCallback(async () => {
    try {
      if (!useMockAuth) {
        const list = await api.listRestaurants(filterCityId || undefined);
        setRestaurants(list);
      }
    } catch {
      setRestaurants([]);
    }
  }, [useMockAuth, filterCityId]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const handleSubmitDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !useMockAuth) {
      setAuthOpen(true);
      return;
    }
    if (suggestBlocked) {
      setError('This restaurant is not accepting community dish suggestions.');
      return;
    }
    if (!categoryId) {
      setError('Pick a category from the list');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (dishRestaurantMode === 'new') {
        if (!dishRestCityId) {
          setError('Select a city for the restaurant');
          setLoading(false);
          return;
        }
        if (!dishRestName.trim() || !dishRestAddress.trim()) {
          setError('Enter restaurant name and address');
          setLoading(false);
          return;
        }
        if (!dishRestCoords) {
          setError('Set the restaurant location on the map');
          setLoading(false);
          return;
        }
        if (!useMockAuth) {
          await api.submitRestaurant({
            name: dishRestName.trim(),
            address: dishRestAddress.trim(),
            cityId: dishRestCityId,
            lat: dishRestCoords.lat,
            lng: dishRestCoords.lng,
            dishes: [
              {
                name: name.trim(),
                categoryId,
                category: category.trim(),
                price: price ? Number(price) : undefined,
              },
            ],
          });
        }
        setSubmitKind('dish-with-restaurant');
      } else {
        if (!restaurantId) {
          setError('Pick an existing restaurant, or switch to New restaurant');
          setLoading(false);
          return;
        }
        if (!useMockAuth) {
          await api.addDish({
            name: name.trim(),
            restaurantId,
            categoryId,
            category: category.trim(),
            price: price ? Number(price) : undefined,
          });
        }
        setSubmitKind('dish');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !useMockAuth) {
      setAuthOpen(true);
      return;
    }
    if (!restCityId) {
      setError('Select a city');
      return;
    }
    if (!restCoords) {
      setError('Set the restaurant location on the map');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dishes = dishDrafts
        .filter((d) => d.name.trim() && d.categoryId)
        .map((d) => ({
          name: d.name.trim(),
          categoryId: d.categoryId,
          category: d.category.trim(),
          price: d.price ? Number(d.price) : undefined,
        }));

      if (!useMockAuth) {
        await api.submitRestaurant({
          name: restName.trim(),
          address: restAddress.trim(),
          cityId: restCityId,
          lat: restCoords.lat,
          lng: restCoords.lng,
          dishes: dishes.length ? dishes : undefined,
        });
      }
      setSubmitKind('restaurant');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <FormSuccess
        icon={CheckCircle2}
        title="Submitted for review"
        message={
          submitKind === 'restaurant' || submitKind === 'dish-with-restaurant'
            ? 'Your restaurant and dish will appear in search only after an admin approves them.'
            : 'Your dish will appear after admin approval.'
        }
      >
        <Button onClick={() => router.push('/')}>Back to Home</Button>
        <Button variant="outline" onClick={() => router.push('/search')}>
          Browse search
        </Button>
      </FormSuccess>
    );
  }

  return (
    <FormPageShell
      icon={UtensilsCrossed}
      title={restaurantLocked ? 'Add a dish' : 'Suggest a listing'}
      subtitle={
        restaurantLocked
          ? 'Suggest a plate for this restaurant. It goes to admin review before it appears on the menu.'
          : 'Add a dish to an existing place, or create the restaurant in the same form if it isn’t listed yet.'
      }
      asideTitle="How it works"
      asideBody="Suggestions need admin approval before they show in search. Suggesting does not make you the restaurant owner — ownership is only assigned when the venue contacts DishRank."
    >
      {!user && !useMockAuth && (
        <SignInPrompt
          className="mb-5"
          message={
            mode === 'restaurant'
              ? 'Create a free account to suggest this restaurant for the catalog.'
              : 'Create a free account to suggest this dish for the catalog.'
          }
          onSignIn={() => setAuthOpen(true)}
        />
      )}

      {suggestBlocked && (
        <p className="mb-5 rounded-card border border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          This restaurant isn’t accepting community dish suggestions. Only staff can add dishes
          here.
        </p>
      )}

      {!restaurantLocked && (
        <div className="mb-5">
          <ModeToggle
            value={mode}
            options={[
              { id: 'dish', label: 'Add dish' },
              { id: 'restaurant', label: 'Add restaurant' },
            ]}
            onChange={(id) => {
              setMode(id as 'dish' | 'restaurant');
              setError(null);
            }}
          />
        </div>
      )}

      {mode === 'dish' ? (
        <FormSection
          title="Dish details"
          description={
            restaurantLocked
              ? 'Fill in the dish — the restaurant is already selected.'
              : 'Add the plate, then pick an existing restaurant — or create a new one without leaving this form.'
          }
        >
          <form onSubmit={handleSubmitDish} className="space-y-4">
            <div>
              <FieldLabel>Dish name</FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Chicken Biryani"
              />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <CategorySelect
                valueId={categoryId}
                valueName={category}
                onChange={({ id, name: catName }) => {
                  setCategoryId(id);
                  setCategory(catName);
                }}
              />
            </div>
            <div>
              <FieldLabel>Price (optional)</FieldLabel>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="450"
              />
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              {restaurantLocked ? (
                <div className="flex items-start gap-3 rounded-button border border-primary/20 bg-primary/5 px-3.5 py-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
                    <Store className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Adding to
                    </p>
                    <p className="mt-0.5 font-display text-base font-semibold text-foreground">
                      {restaurantLabel || 'Selected restaurant'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This dish will be linked to this venue after approval.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <FieldLabel>Restaurant</FieldLabel>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Can’t find the place? Choose New restaurant and enter it here.
                    </p>
                    <ModeToggle
                      value={dishRestaurantMode}
                      options={[
                        { id: 'existing', label: 'Existing' },
                        { id: 'new', label: 'New restaurant' },
                      ]}
                      onChange={(id) => {
                        setDishRestaurantMode(id as 'existing' | 'new');
                        setError(null);
                        if (id === 'new') {
                          setRestaurantId('');
                          setRestaurantLabel('');
                        }
                      }}
                    />
                  </div>

                  {dishRestaurantMode === 'existing' ? (
                    <div className="space-y-2">
                      <div>
                        <FieldLabel>Filter by city</FieldLabel>
                        <CitySelect value={filterCityId} onChange={setFilterCityId} />
                      </div>
                      <div>
                        <FieldLabel>Find restaurant</FieldLabel>
                        <RestaurantNameSuggest
                          value={restaurantLabel}
                          cityId={filterCityId}
                          required
                          placeholder="Type restaurant name…"
                          onChange={(next) => {
                            setRestaurantLabel(next);
                            if (restaurantId) setRestaurantId('');
                          }}
                          onPickExisting={(r) => {
                            setRestaurantId(r.id);
                            setRestaurantLabel(
                              [r.name, r.city?.name].filter(Boolean).join(' · '),
                            );
                          }}
                        />
                        {restaurantId ? (
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            Selected restaurant is ready to submit.
                          </p>
                        ) : restaurantLabel.trim() ? (
                          <p className="mt-1.5 text-[11px] text-amber-700">
                            Pick a match from the list, or switch to New restaurant.
                          </p>
                        ) : restaurants.length === 0 ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            No approved restaurants in this city yet — use New restaurant.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-button border border-border/80 bg-muted/20 p-3.5">
                      <div>
                        <FieldLabel>Restaurant name</FieldLabel>
                        <RestaurantNameSuggest
                          value={dishRestName}
                          cityId={dishRestCityId}
                          required
                          placeholder="e.g. Student Biryani"
                          onChange={(next) => {
                            setDishRestName(next);
                          }}
                          onPickExisting={(r) => {
                            // Found a match while creating — prefer attaching to existing
                            setDishRestaurantMode('existing');
                            setRestaurantId(r.id);
                            setRestaurantLabel(
                              [r.name, r.city?.name].filter(Boolean).join(' · '),
                            );
                            if (r.cityId) setFilterCityId(r.cityId);
                          }}
                        />
                      </div>
                      <div>
                        <FieldLabel>Address</FieldLabel>
                        <Input
                          value={dishRestAddress}
                          onChange={(e) => setDishRestAddress(e.target.value)}
                          required
                          placeholder="Street / area"
                        />
                      </div>
                      <div>
                        <FieldLabel>City</FieldLabel>
                        <CitySelect
                          allowAll={false}
                          value={dishRestCityId}
                          onChange={(id) => {
                            setDishRestCityId(id);
                            setDishRestCoords(null);
                          }}
                        />
                      </div>
                      <div>
                        <FieldLabel>Location on map</FieldLabel>
                        <LocationPicker
                          key={dishRestCityId || 'city'}
                          value={dishRestCoords}
                          onChange={setDishRestCoords}
                          defaultCenter={coordsForCity(
                            dishRestCityId || preferredCityId || 'city-karachi',
                            cities.find((c) => c.id === dishRestCityId)?.name,
                          )}
                          cityName={cities.find((c) => c.id === dishRestCityId)?.name}
                          searchHint="Search place, street, or landmark…"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Restaurant and dish are submitted together for admin approval. You are not
                        marked as the owner.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={
                loading ||
                !categoryId ||
                (dishRestaurantMode === 'existing' ? !restaurantId : !dishRestName.trim())
              }
            >
              {loading
                ? 'Submitting…'
                : dishRestaurantMode === 'new'
                  ? 'Submit restaurant & dish'
                  : 'Submit dish for approval'}
            </Button>
          </form>
        </FormSection>
      ) : (
        <FormSection
          title="Restaurant details"
          description="Suggest a new venue. You can attach a few dishes in the same submission."
        >
          <form onSubmit={handleSubmitRestaurant} className="space-y-4">
            <div>
              <FieldLabel>Restaurant name</FieldLabel>
              <RestaurantNameSuggest
                value={restName}
                cityId={restCityId}
                required
                placeholder="e.g. Student Biryani"
                onChange={(nextName) => {
                  setRestName(nextName);
                  if (
                    existingMatch &&
                    nextName.trim().toLowerCase() !== existingMatch.name.toLowerCase()
                  ) {
                    setExistingMatch(null);
                  }
                }}
                onPickExisting={(r) => {
                  setExistingMatch(r);
                  setRestName(r.name);
                  setRestAddress(r.address);
                  if (r.cityId) setRestCityId(r.cityId);
                }}
              />
              {existingMatch && (
                <div className="mt-2 rounded-button border border-amber-200/80 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950">
                  <p>
                    <span className="font-semibold">{existingMatch.name}</span> is already listed
                    {existingMatch.city ? ` in ${existingMatch.city.name}` : ''}. Prefer adding a
                    dish instead of creating a duplicate.
                  </p>
                  <button
                    type="button"
                    className="mt-1.5 text-sm font-semibold text-primary underline-offset-2 hover:underline"
                    onClick={() => {
                      setMode('dish');
                      setDishRestaurantMode('existing');
                      setRestaurantId(existingMatch.id);
                      setRestaurantLabel(
                        [existingMatch.name, existingMatch.city?.name]
                          .filter(Boolean)
                          .join(' · '),
                      );
                      if (existingMatch.cityId) setFilterCityId(existingMatch.cityId);
                    }}
                  >
                    Switch to Add dish
                  </button>
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Address</FieldLabel>
              <Input
                value={restAddress}
                onChange={(e) => setRestAddress(e.target.value)}
                required
                placeholder="123 Main St"
              />
            </div>
            <div>
              <FieldLabel>City</FieldLabel>
              <CitySelect
                allowAll={false}
                value={restCityId}
                onChange={(id) => {
                  setRestCityId(id);
                  setRestCoords(null);
                }}
              />
            </div>
            <div>
              <FieldLabel>Location on map</FieldLabel>
              <LocationPicker
                key={restCityId || 'city'}
                value={restCoords}
                onChange={setRestCoords}
                defaultCenter={coordsForCity(
                  restCityId || preferredCityId || 'city-karachi',
                  cities.find((c) => c.id === restCityId)?.name,
                )}
                cityName={cities.find((c) => c.id === restCityId)?.name}
                searchHint="Search place, street, or landmark…"
              />
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Dishes (optional)</h3>
                  <p className="text-xs text-muted-foreground">
                    Add plates served here so approval can cover both.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDishDrafts((d) => [...d, emptyDish()])}
                >
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                  Add
                </Button>
              </div>
              <div className="space-y-3">
                {dishDrafts.map((draft, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-button border border-border/80 bg-muted/30 p-3"
                  >
                    <div className="grid grid-cols-[1fr_72px_auto] items-end gap-2">
                      <Input
                        value={draft.name}
                        onChange={(e) =>
                          setDishDrafts((rows) =>
                            rows.map((r, i) =>
                              i === index ? { ...r, name: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder="Dish"
                      />
                      <Input
                        type="number"
                        value={draft.price}
                        onChange={(e) =>
                          setDishDrafts((rows) =>
                            rows.map((r, i) =>
                              i === index ? { ...r, price: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder="Rs"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={dishDrafts.length === 1}
                        onClick={() =>
                          setDishDrafts((rows) => rows.filter((_, i) => i !== index))
                        }
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CategorySelect
                      valueId={draft.categoryId}
                      valueName={draft.category}
                      onChange={({ id, name: catName }) =>
                        setDishDrafts((rows) =>
                          rows.map((r, i) =>
                            i === index ? { ...r, categoryId: id, category: catName } : r,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={loading || !restName.trim() || !restCityId}
            >
              {loading ? 'Submitting…' : 'Submit restaurant for approval'}
            </Button>
          </form>
        </FormSection>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground sm:text-left">
        Looking to rate something you already ate?{' '}
        <Link href="/rate" className="font-semibold text-primary hover:underline">
          Rate a dish
        </Link>
      </p>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} redirectStaff={false} />
    </FormPageShell>
  );
}

export default function AddDishPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container py-10">
          <div className="h-40 animate-pulse rounded-card bg-muted" />
        </div>
      }
    >
      <AddDishForm />
    </Suspense>
  );
}
