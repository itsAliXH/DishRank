'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Dish, Review } from '@dishrank/shared';
import { Bookmark, ChevronDown, KeyRound, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReviewCard } from '@/features/reviews/review-card';
import { VerifyDialog } from '@/features/reviews/verify-dialog';
import { TrendingDishCard } from '@/features/dishes/trending-dish-card';
import { useAuth } from '@/providers/auth-context';
import { useBookmarks } from '@/providers/bookmarks-context';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function ProfileReviewsPanel() {
  const { user, useMockAuth } = useAuth();
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState('all');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyReview, setVerifyReview] = useState<Review | null>(null);

  const reload = useCallback(async () => {
    if (!user || useMockAuth) {
      setMyReviews([]);
      return;
    }
    try {
      setMyReviews(await api.getMyReviews());
    } catch {
      /* keep previous */
    }
  }, [user, useMockAuth]);

  useEffect(() => {
    if (!user || useMockAuth) {
      setMyReviews([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setReviewsLoading(true);
      try {
        const list = await api.getMyReviews();
        if (!cancelled) setMyReviews(list);
      } catch {
        if (!cancelled) setMyReviews([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, useMockAuth]);

  const cityOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of myReviews) {
      const city = r.dish?.restaurant?.city;
      if (city?.id && city.name) map.set(city.id, city.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [myReviews]);

  useEffect(() => {
    if (cityFilter !== 'all' && !cityOptions.some((c) => c.id === cityFilter)) {
      setCityFilter('all');
    }
  }, [cityFilter, cityOptions]);

  const filteredReviews = useMemo(() => {
    if (cityFilter === 'all') return myReviews;
    return myReviews.filter((r) => r.dish?.restaurant?.city?.id === cityFilter);
  }, [myReviews, cityFilter]);

  return (
    <>
      {!reviewsLoading && myReviews.length > 0 && cityOptions.length > 0 && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="review-city-filter">
            Filter by city
          </label>
          <select
            id="review-city-filter"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className={cn(
              'flex h-11 w-full rounded-button border border-border bg-surface px-3 py-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            <option value="all">All cities</option>
            {cityOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {reviewsLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-muted" />
          ))}
        </div>
      ) : myReviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No reviews yet.</p>
      ) : filteredReviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No reviews in this city.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              showAuthor={false}
              onVerify={
                !r.verified && r.dish?.restaurant?.receiptVerifyEnabled !== false
                  ? () => {
                      setVerifyReview(r);
                      setVerifyOpen(true);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <VerifyDialog
        open={verifyOpen}
        onOpenChange={(open) => {
          setVerifyOpen(open);
          if (!open) setVerifyReview(null);
        }}
        reviewId={verifyReview?.id || ''}
        restaurantName={verifyReview?.dish?.restaurant?.name || 'the restaurant'}
        onSuccess={reload}
      />
    </>
  );
}

export function ProfileSavedPanel() {
  const { user, useMockAuth } = useAuth();
  const { savedIds, version } = useBookmarks();
  const [savedDishes, setSavedDishes] = useState<Dish[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const loadSaved = useCallback(async () => {
    if (!user || useMockAuth) {
      setSavedDishes([]);
      return;
    }
    setSavedLoading(true);
    try {
      const list = await api.getBookmarks();
      setSavedDishes(list.filter((d) => savedIds.has(d.id)));
    } catch {
      setSavedDishes([]);
    } finally {
      setSavedLoading(false);
    }
  }, [user, useMockAuth, savedIds]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved, version]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tap the filled bookmark to unsave. Only signed-in users can save dishes.
      </p>
      {savedLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-card bg-muted" />
          ))}
        </div>
      ) : savedDishes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No saved dishes yet. Tap the bookmark on any dish to save it.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {savedDishes.map((d) => (
            <TrendingDishCard key={d.id} dish={d} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfileAccountPanel({ showSignOut = true }: { showSignOut?: boolean }) {
  const router = useRouter();
  const { user, logout, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
    }
  }, [user]);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileMessage(null);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      setProfileMessage('Profile updated.');
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(false);

    if (newPassword.length < 6) {
      setPasswordError(true);
      setPasswordMessage('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(true);
      setPasswordMessage('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated.');
    } catch (err) {
      setPasswordError(true);
      setPasswordMessage(err instanceof Error ? err.message : 'Password update failed');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSaveProfile}
        className="space-y-3 rounded-card border border-border bg-surface p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="+92 300 1234567"
          />
        </div>
        {profileMessage && (
          <p className="text-sm text-primary" role="status">
            {profileMessage}
          </p>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <button
          type="button"
          className="flex h-12 w-full items-center justify-between gap-2 px-4 text-left text-sm font-medium transition-colors hover:bg-muted/60"
          aria-expanded={passwordOpen}
          onClick={() => setPasswordOpen((open) => !open)}
        >
          <span className="inline-flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Change password
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-soft',
              passwordOpen && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
        {passwordOpen && (
          <form
            onSubmit={handleChangePassword}
            className="animate-slide-up space-y-3 border-t border-border p-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium">Current password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">New password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Confirm new password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            {passwordMessage && (
              <p
                className={`text-sm ${passwordError ? 'text-destructive' : 'text-primary'}`}
                role="status"
              >
                {passwordMessage}
              </p>
            )}
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <button
          type="button"
          className="flex h-12 w-full items-center justify-between gap-2 px-4 text-left text-sm font-medium transition-colors hover:bg-muted/60"
          aria-expanded={savedOpen}
          onClick={() => setSavedOpen((open) => !open)}
        >
          <span className="inline-flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            View all saved dishes
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-soft',
              savedOpen && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
        {savedOpen && (
          <div className="animate-slide-up space-y-3 border-t border-border p-4">
            <ProfileSavedPanel />
            <Link
              href="/saved"
              className="inline-flex text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Open full saved page
            </Link>
          </div>
        )}
      </div>

      {showSignOut && (
        <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Sign Out
        </Button>
      )}
    </div>
  );
}
