'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Dish, Restaurant } from '@dishrank/shared';
import { CheckCircle2, Star } from 'lucide-react';
import { AuthDialog } from '@/features/auth/auth-dialog';
import { CategorySelect } from '@/components/shell/category-select';
import { CitySelect } from '@/components/shell/city-select';
import { RestaurantNameSuggest } from '@/components/shell/restaurant-name-suggest';
import { SignInPrompt } from '@/components/shell/sign-in-prompt';
import {
  FormPageShell,
  FormSection,
  FormSuccess,
  ModeToggle,
} from '@/components/shell/form-page-shell';
import { LocationPicker, type LatLng } from '@/components/shell/location-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-context';
import { useCity } from '@/providers/city-context';
import { coordsForCity } from '@/lib/city-coords';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_META: Record<Step, { title: string; description: string }> = {
  1: {
    title: 'Category',
    description: 'Pick an existing category so search stays consistent — no free-text names.',
  },
  2: {
    title: 'Dish',
    description: 'Choose a listed dish or add a new one under this category.',
  },
  3: {
    title: 'City',
    description: 'Where did you try it?',
  },
  4: {
    title: 'Restaurant',
    description: 'Pick the venue or suggest a new one for approval.',
  },
  5: {
    title: 'Your rating',
    description: 'Stars and an optional note. Receipt verification is a separate step.',
  },
};

export default function RatePage() {
  const router = useRouter();
  const { user, useMockAuth } = useAuth();
  const { cityId: preferredCityId, cities } = useCity();
  const [authOpen, setAuthOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);

  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [dishMode, setDishMode] = useState<'existing' | 'new'>('existing');
  const [dishQuery, setDishQuery] = useState('');
  const [dishMatches, setDishMatches] = useState<Dish[]>([]);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');

  const [cityId, setCityId] = useState<string | null>(null);
  const [citySeeded, setCitySeeded] = useState(false);
  const [restaurantMode, setRestaurantMode] = useState<'existing' | 'new'>('existing');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [newRestName, setNewRestName] = useState('');
  const [newRestAddress, setNewRestAddress] = useState('');
  const [newRestCoords, setNewRestCoords] = useState<LatLng | null>(null);

  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; dishId?: string } | null>(null);

  useEffect(() => {
    if (citySeeded || !preferredCityId) return;
    setCityId(preferredCityId);
    setCitySeeded(true);
  }, [preferredCityId, citySeeded]);

  const loadDishMatches = useCallback(async () => {
    if (!categoryName || useMockAuth) {
      setDishMatches([]);
      return;
    }
    try {
      const results = await api.search({
        type: 'dish',
        category: categoryName,
        q: dishQuery || undefined,
        cityId: cityId || undefined,
      });
      setDishMatches(results as Dish[]);
    } catch {
      setDishMatches([]);
    }
  }, [categoryName, dishQuery, cityId, useMockAuth]);

  useEffect(() => {
    if (step === 2) loadDishMatches();
  }, [step, loadDishMatches]);

  useEffect(() => {
    if (step !== 4 || !cityId || useMockAuth) return;
    (async () => {
      try {
        const list = await api.listRestaurants(cityId);
        setRestaurants(list);
      } catch {
        setRestaurants([]);
      }
    })();
  }, [step, cityId, useMockAuth]);

  const requireAuth = () => {
    if (!user && !useMockAuth) {
      setAuthOpen(true);
      return false;
    }
    return true;
  };

  const goNext = () => setStep((s) => Math.min(5, (s + 1) as Step) as Step);
  const goBack = () => setStep((s) => Math.max(1, (s - 1) as Step) as Step);

  const handleSubmit = async () => {
    if (!requireAuth()) return;
    setError(null);
    setSubmitting(true);
    try {
      if (dishMode === 'existing' && selectedDish) {
        if (selectedDish.restaurant?.reviewsEnabled === false) {
          throw new Error('Reviews are disabled for this restaurant');
        }
        if (!useMockAuth) {
          await api.submitReview(selectedDish.id, {
            rating,
            text: text.trim() || undefined,
          });
        }
        const canVerify = selectedDish.restaurant?.receiptVerifyEnabled !== false;
        const allowGeneral = selectedDish.restaurant?.allowGeneralReviews !== false;
        setDone({
          message:
            canVerify && !allowGeneral
              ? 'Rating held for Verified. Open the dish page to upload your receipt — an admin must approve it.'
              : canVerify
                ? 'Saved as General. Add an on-site receipt on the dish page to request Verified (admin approves).'
                : 'Saved as a General review.',
          dishId: selectedDish.id,
        });
        return;
      }

      if (restaurantMode === 'new') {
        if (!cityId) throw new Error('Select a city');
        if (!newRestCoords) throw new Error('Set the restaurant location on the map');
        let dishId: string | undefined;
        if (!useMockAuth) {
          const created = await api.submitRestaurant({
            name: newRestName.trim(),
            address: newRestAddress.trim(),
            cityId,
            lat: newRestCoords.lat,
            lng: newRestCoords.lng,
            dishes: [
              {
                name: newDishName.trim(),
                categoryId,
                category: categoryName.trim(),
                price: newDishPrice ? Number(newDishPrice) : undefined,
              },
            ],
          });
          dishId = created.dishes?.[0]?.id;
          if (dishId) {
            await api.submitReview(dishId, {
              rating,
              text: text.trim() || undefined,
            });
          }
        }
        setDone({
          message:
            'Restaurant, dish, and rating submitted. Admin must approve the restaurant (and dish) before they appear in search. Receipt verification is a separate step.',
          dishId,
        });
        return;
      }

      let dishId: string | undefined;
      if (!useMockAuth) {
        const dish = await api.addDish({
          name: newDishName.trim(),
          restaurantId: selectedRestaurantId,
          categoryId,
          category: categoryName.trim(),
          price: newDishPrice ? Number(newDishPrice) : undefined,
        });
        dishId = dish.id;
        await api.submitReview(dish.id, {
          rating,
          text: text.trim() || undefined,
        });
      }
      setDone({
        message:
          'Dish submitted for approval (admin or restaurant owner can approve). Your rating is saved; receipt verification is separate.',
        dishId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <FormSuccess icon={CheckCircle2} title="Thanks!" message={done.message}>
        {done.dishId && (
          <Button onClick={() => router.push(`/dishes/${done.dishId}`)}>View dish</Button>
        )}
        <Button variant="outline" onClick={() => router.push('/')}>
          Home
        </Button>
      </FormSuccess>
    );
  }

  const meta = STEP_META[step];

  return (
    <FormPageShell
      icon={Star}
      title="Rate a dish"
      subtitle="Walk through category, dish, place, and stars — so ratings stay tied to the plate, not just the restaurant."
      asideTitle="What to expect"
      asideBody="New dishes or restaurants need approval before they appear in search. Receipt verification is optional and happens after you submit."
    >
      {!user && !useMockAuth && (
        <SignInPrompt
          className="mb-5"
          message="Sign in to submit a rating and help others find the best dishes."
          onSignIn={() => setAuthOpen(true)}
        />
      )}

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step {step} of 5
          </p>
          <p className="truncate text-xs text-muted-foreground">{meta.title}</p>
        </div>
        <div className="flex gap-1.5">
          {([1, 2, 3, 4, 5] as Step[]).map((n) => (
            <div
              key={n}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                n <= step ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
      </div>

      <FormSection title={meta.title} description={meta.description}>
        {step === 1 && (
          <div className="space-y-4">
            <CategorySelect
              valueId={categoryId}
              valueName={categoryName}
              onChange={({ id, name }) => {
                setCategoryId(id);
                setCategoryName(name);
              }}
            />
            <Button
              className="w-full sm:w-auto"
              disabled={!categoryId}
              onClick={() => {
                setSelectedDish(null);
                setDishQuery('');
                goNext();
              }}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">
              Category · <span className="text-foreground">{categoryName}</span>
            </p>
            <ModeToggle
              value={dishMode}
              options={[
                { id: 'existing', label: 'Existing' },
                { id: 'new', label: 'Add new' },
              ]}
              onChange={(id) => setDishMode(id as 'existing' | 'new')}
            />

            {dishMode === 'existing' ? (
              <>
                <Input
                  value={dishQuery}
                  onChange={(e) => setDishQuery(e.target.value)}
                  placeholder="Search dishes…"
                />
                <div className="max-h-56 overflow-y-auto rounded-card border border-border divide-y">
                  {dishMatches.length === 0 ? (
                    <p className="p-3.5 text-sm text-muted-foreground">
                      No matches. Try Add new if the dish isn’t listed yet.
                    </p>
                  ) : (
                    dishMatches.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDish(d)}
                        className={cn(
                          'w-full px-3.5 py-2.5 text-left text-sm hover:bg-muted',
                          selectedDish?.id === d.id && 'bg-primary/10',
                        )}
                      >
                        <span className="font-medium">{d.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {d.restaurant?.name}
                          {d.restaurant?.city ? ` · ${d.restaurant.city.name}` : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="sm:flex-1" onClick={goBack}>
                    Back
                  </Button>
                  <Button
                    className="sm:flex-1"
                    disabled={!selectedDish}
                    onClick={() => setStep(5)}
                  >
                    Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Input
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="Dish name"
                  required
                />
                <Input
                  type="number"
                  value={newDishPrice}
                  onChange={(e) => setNewDishPrice(e.target.value)}
                  placeholder="Price (optional)"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="sm:flex-1" onClick={goBack}>
                    Back
                  </Button>
                  <Button
                    className="sm:flex-1"
                    disabled={!newDishName.trim()}
                    onClick={() => {
                      setSelectedDish(null);
                      goNext();
                    }}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <CitySelect
              allowAll={false}
              value={cityId}
              onChange={(id) => {
                setCityId(id);
                setNewRestCoords(null);
              }}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="sm:flex-1" onClick={goBack}>
                Back
              </Button>
              <Button className="sm:flex-1" disabled={!cityId} onClick={goNext}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <ModeToggle
              value={restaurantMode}
              options={[
                { id: 'existing', label: 'Existing' },
                { id: 'new', label: 'Add new' },
              ]}
              onChange={(id) => setRestaurantMode(id as 'existing' | 'new')}
            />

            {restaurantMode === 'existing' ? (
              <>
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  className="flex h-11 w-full rounded-button border border-border bg-surface px-3 text-sm"
                >
                  <option value="">Select restaurant</option>
                  {restaurants.map((r) => {
                    const blocked =
                      r.reviewsEnabled === false || r.communityDishSubmitEnabled === false;
                    return (
                      <option key={r.id} value={r.id} disabled={blocked}>
                        {r.name}
                        {r.reviewsEnabled === false
                          ? ' (ratings off)'
                          : r.communityDishSubmitEnabled === false
                            ? ' (no dish suggestions)'
                            : ''}
                      </option>
                    );
                  })}
                </select>
                {selectedRestaurantId &&
                  restaurants.find((r) => r.id === selectedRestaurantId)?.reviewsEnabled ===
                    false && (
                    <p className="text-xs text-destructive">
                      Ratings are turned off for this restaurant.
                    </p>
                  )}
              </>
            ) : (
              <>
                <RestaurantNameSuggest
                  value={newRestName}
                  cityId={cityId}
                  placeholder="Restaurant name"
                  onChange={setNewRestName}
                  onPickExisting={(r) => {
                    setNewRestName(r.name);
                    setNewRestAddress(r.address);
                    if (r.cityId) setCityId(r.cityId);
                    setRestaurantMode('existing');
                    setSelectedRestaurantId(r.id);
                  }}
                />
                <Input
                  value={newRestAddress}
                  onChange={(e) => setNewRestAddress(e.target.value)}
                  placeholder="Address"
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Location on map</label>
                  <LocationPicker
                    key={cityId || 'city'}
                    value={newRestCoords}
                    onChange={setNewRestCoords}
                    defaultCenter={coordsForCity(
                      cityId || preferredCityId || 'city-karachi',
                      cities.find((c) => c.id === cityId)?.name,
                    )}
                    cityName={cities.find((c) => c.id === cityId)?.name}
                    searchHint="Search place, street, or landmark…"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  New restaurants need admin approval. You are not marked as the owner. Prefer an
                  existing match when you see one.
                </p>
              </>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="sm:flex-1" onClick={goBack}>
                Back
              </Button>
              <Button
                className="sm:flex-1"
                disabled={
                  restaurantMode === 'existing'
                    ? !selectedRestaurantId
                    : !newRestName.trim() || !newRestAddress.trim()
                }
                onClick={goNext}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="rounded-button bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">
              {dishMode === 'existing' && selectedDish
                ? `${selectedDish.name} at ${selectedDish.restaurant?.name}`
                : `${newDishName || 'New dish'} · ${categoryName}`}
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Stars</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="flex h-11 w-full rounded-button border border-border bg-surface px-3 text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n !== 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Comment (optional)</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="w-full rounded-button border border-border bg-surface px-3 py-2 text-sm"
                placeholder="How was it?"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="sm:flex-1"
                onClick={() => setStep(dishMode === 'existing' ? 2 : 4)}
              >
                Back
              </Button>
              <Button className="sm:flex-1" disabled={submitting} onClick={handleSubmit}>
                {submitting ? 'Submitting…' : 'Submit rating'}
              </Button>
            </div>
          </div>
        )}
      </FormSection>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} redirectStaff={false} />
    </FormPageShell>
  );
}
