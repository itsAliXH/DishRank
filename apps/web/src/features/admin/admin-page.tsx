'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Dish, Restaurant, Review } from '@dishrank/shared';
import {
  Bookmark,
  FolderOpen,
  Inbox,
  Key,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquareText,
  Plus,
  PlusCircle,
  Settings,
  Shield,
  Star,
  Tags,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/shell/back-button';
import { CitySelect } from '@/components/shell/city-select';
import { CategorySelect } from '@/components/shell/category-select';
import { LocationPicker } from '@/components/shell/location-picker';
import { AdminCatalogManager } from '@/features/admin/admin-catalog-manager';
import { AdminCitiesManager } from '@/features/admin/admin-cities-manager';
import { AdminUsersManager } from '@/features/admin/admin-users-manager';
import { AdminReviewsManager } from '@/features/admin/admin-reviews-manager';
import { AdminCategoriesManager } from '@/features/admin/admin-categories-manager';
import { AdminPermissionsManager } from '@/features/admin/admin-permissions-manager';
import { AdminOverviewDashboard } from '@/features/admin/admin-overview-dashboard';
import {
  AdminField,
  AdminFormSection,
  AdminSegmentedControl,
  adminSelectClassName,
} from '@/features/admin/admin-ui';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { MediaImage } from '@/features/dishes/media-image';
import {
  ProfileAccountPanel,
  ProfileReviewsPanel,
  ProfileSavedPanel,
} from '@/features/profile/profile-personal-panels';
import { useAuth } from '@/providers/auth-context';
import { useCity } from '@/providers/city-context';
import { api } from '@/lib/api';
import { mockDishes, mockReviews } from '@/lib/mock-data';
import { coordsForCity } from '@/lib/city-coords';
import { cn } from '@/lib/utils';
import { PanelLoading, Spinner } from '@/components/ui/loading';
import {
  InboxReviewDialog,
  type DishApproveEdits,
  type InboxReviewTarget,
  type RestaurantApproveEdits,
} from '@/features/inbox/inbox-review-dialog';

type AdminRestaurant = Restaurant & { _count?: { dishes: number } };
type PendingRestaurant = Restaurant & {
  dishes?: Dish[];
  _count?: { dishes: number };
  city?: { id: string; name: string; province: string } | null;
};

/** Street + City, Province · Pakistan (when city is known). */
function formatFullAddress(
  address?: string | null,
  city?: { name: string; province?: string | null } | null,
  country = 'Pakistan',
) {
  const street = address?.trim() || '';
  const place = [city?.name, city?.province, country].filter(Boolean).join(', ');
  if (street && place) return `${street} · ${place}`;
  return street || place || 'Address unknown';
}

type DishDraft = {
  name: string;
  categoryId: string;
  category: string;
  price: string;
};

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

const emptyDishDraft = (): DishDraft => ({
  name: '',
  categoryId: '',
  category: '',
  price: '',
});

const NAV: {
  id: AdminTab;
  label: string;
  hint: string;
  icon: LucideIcon;
  group: 'work' | 'setup' | 'you';
}[] = [
  { id: 'overview', label: 'Overview', hint: 'Stats by location', icon: LayoutDashboard, group: 'work' },
  { id: 'inbox', label: 'Inbox', hint: 'Approve submissions', icon: Inbox, group: 'work' },
  { id: 'catalog', label: 'Catalog', hint: 'Restaurants & dishes', icon: FolderOpen, group: 'work' },
  { id: 'reviews', label: 'Reviews', hint: 'Moderate ratings', icon: MessageSquareText, group: 'work' },
  { id: 'create', label: 'Create', hint: 'Add live listings', icon: PlusCircle, group: 'work' },
  { id: 'cities', label: 'Cities', hint: 'Locations', icon: MapPin, group: 'setup' },
  { id: 'categories', label: 'Categories', hint: 'Dish types', icon: Tags, group: 'setup' },
  { id: 'permissions', label: 'Permissions', hint: 'Per-restaurant flags', icon: Key, group: 'setup' },
  { id: 'accounts', label: 'Accounts', hint: 'Users & owners', icon: Users, group: 'setup' },
  { id: 'my-reviews', label: 'My reviews', hint: 'Ratings you left', icon: Star, group: 'you' },
  { id: 'saved', label: 'Saved', hint: 'Bookmarked dishes', icon: Bookmark, group: 'you' },
  { id: 'account', label: 'Account', hint: 'Name, email & phone', icon: Settings, group: 'you' },
];

const VALID_TABS = new Set(NAV.map((n) => n.id));

function AdminPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, useMockAuth, logout } = useAuth();
  const { cityId: preferredCityId, cities } = useCity();

  const tabParam = searchParams.get('tab') || 'overview';
  const tab: AdminTab = VALID_TABS.has(tabParam as AdminTab)
    ? (tabParam as AdminTab)
    : 'overview';
  const modeParam = searchParams.get('mode');
  const restaurantIdParam = searchParams.get('restaurantId');

  const setTab = (next: AdminTab) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', next);
    if (next !== 'create') {
      sp.delete('mode');
      sp.delete('restaurantId');
    }
    router.replace(`/admin?${sp.toString()}`, { scroll: false });
  };

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingRestaurants, setPendingRestaurants] = useState<PendingRestaurant[]>([]);
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxRefreshing, setInboxRefreshing] = useState(false);
  const [createMode, setCreateMode] = useState<'restaurant' | 'dish'>(
    modeParam === 'dish' ? 'dish' : 'restaurant',
  );

  const [restName, setRestName] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [restCityId, setRestCityId] = useState('city-karachi');
  const [restLat, setRestLat] = useState('24.8607');
  const [restLng, setRestLng] = useState('67.0011');
  const [citySeeded, setCitySeeded] = useState(false);
  const [restImageUrl, setRestImageUrl] = useState('');
  const [dishDrafts, setDishDrafts] = useState<DishDraft[]>([emptyDishDraft()]);
  const [creatingRestaurant, setCreatingRestaurant] = useState(false);
  const [restaurantMessage, setRestaurantMessage] = useState<string | null>(null);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [dishName, setDishName] = useState('');
  const [dishCategoryId, setDishCategoryId] = useState('');
  const [dishCategory, setDishCategory] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishImageUrl, setDishImageUrl] = useState('');
  const [creatingDish, setCreatingDish] = useState(false);
  const [dishMessage, setDishMessage] = useState<string | null>(null);

  const loadPending = useCallback(async (opts?: { refresh?: boolean }) => {
    if (opts?.refresh) setInboxRefreshing(true);
    else setInboxLoading(true);
    try {
      if (!useMockAuth) {
        const data = await api.getAdminPending();
        setPendingRestaurants(data.restaurants || []);
        setDishes(data.dishes);
        setReviews(data.reviews);
      } else {
        setPendingRestaurants([]);
        setDishes(mockDishes.slice(0, 1));
        setReviews(mockReviews.filter((r) => !r.verified));
      }
    } catch {
      setPendingRestaurants([]);
      setDishes([]);
      setReviews([]);
    } finally {
      setInboxLoading(false);
      setInboxRefreshing(false);
    }
  }, [useMockAuth]);

  const loadRestaurants = useCallback(async () => {
    try {
      if (!useMockAuth) {
        const list = await api.listAdminRestaurants();
        setRestaurants(list);
        setSelectedRestaurantId((current) => current || list[0]?.id || '');
      }
    } catch {
      setRestaurants([]);
    }
  }, [useMockAuth]);

  useEffect(() => {
    loadPending();
    loadRestaurants();
  }, [loadPending, loadRestaurants]);

  useEffect(() => {
    if (modeParam === 'restaurant' || modeParam === 'dish') {
      setCreateMode(modeParam);
    }
  }, [modeParam]);

  useEffect(() => {
    if (restaurantIdParam) {
      setSelectedRestaurantId(restaurantIdParam);
    }
  }, [restaurantIdParam]);

  useEffect(() => {
    if (citySeeded || !preferredCityId) return;
    setRestCityId(preferredCityId);
    const coords = coordsForCity(
      preferredCityId,
      cities.find((c) => c.id === preferredCityId)?.name,
    );
    setRestLat(String(coords.lat));
    setRestLng(String(coords.lng));
    setCitySeeded(true);
  }, [preferredCityId, citySeeded, cities]);

  const pendingTotal = pendingRestaurants.length + dishes.length + reviews.length;

  const activeNav = useMemo(() => NAV.find((n) => n.id === tab), [tab]);

  if (!user) {
    return (
      <div className="page-container py-10 text-center">
        <BackButton />
        <Shield className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="font-display text-xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with an admin account to continue.</p>
        <Link href="/profile" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          Go to Profile
        </Link>
      </div>
    );
  }

  if (user.role !== 'ADMIN' && !useMockAuth) {
    return (
      <div className="page-container py-10 text-center">
        <BackButton />
        <p className="text-muted-foreground py-10">You do not have admin access.</p>
      </div>
    );
  }

  const handleApproveDish = async (id: string, edits?: DishApproveEdits) => {
    const priceTrim = edits?.price?.trim();
    const payload = edits
      ? {
          name: edits.name.trim(),
          categoryId: edits.categoryId,
          price: priceTrim ? Number(priceTrim) : null,
          imageUrl: edits.imageUrl.trim() || null,
          restaurantAddress: edits.restaurantAddress.trim() || undefined,
          restaurantCityId: edits.restaurantCityId || undefined,
          restaurantLat: edits.restaurantCoords?.lat,
          restaurantLng: edits.restaurantCoords?.lng,
        }
      : undefined;
    try {
      await api.approveDish(id, payload);
    } catch (err) {
      if (!useMockAuth) throw err;
    }
    setDishes((d) => d.filter((x) => x.id !== id));
  };

  const handleRejectDish = async (id: string) => {
    try {
      await api.rejectDish(id);
    } catch (err) {
      if (!useMockAuth) throw err;
    }
    setDishes((d) => d.filter((x) => x.id !== id));
  };

  const handleApproveRestaurant = async (id: string, edits?: RestaurantApproveEdits) => {
    const payload = edits
      ? {
          name: edits.name.trim(),
          address: edits.address.trim(),
          cityId: edits.cityId,
          lat: edits.coords!.lat,
          lng: edits.coords!.lng,
          imageUrl: edits.imageUrl.trim() || null,
        }
      : undefined;
    try {
      await api.approveRestaurant(id, payload);
    } catch (err) {
      if (!useMockAuth) throw err;
    }
    setPendingRestaurants((rows) => rows.filter((r) => r.id !== id));
    await loadRestaurants();
  };

  const handleRejectRestaurant = async (id: string) => {
    try {
      await api.rejectRestaurant(id);
    } catch {
      /* mock */
    }
    setPendingRestaurants((rows) => rows.filter((r) => r.id !== id));
  };

  const handleApproveReview = async (id: string) => {
    try {
      await api.approveReview(id);
    } catch {
      /* mock */
    }
    setReviews((r) => r.filter((x) => x.id !== id));
  };

  const handleRejectReview = async (id: string) => {
    try {
      await api.rejectReview(id);
    } catch {
      /* mock */
    }
    setReviews((r) => r.filter((x) => x.id !== id));
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestaurantMessage(null);
    setCreatingRestaurant(true);
    try {
      const dishPayload = dishDrafts
        .filter((d) => d.name.trim() && d.categoryId)
        .map((d) => ({
          name: d.name.trim(),
          categoryId: d.categoryId,
          category: d.category.trim(),
          price: d.price ? Number(d.price) : undefined,
        }));

      const created = await api.createRestaurant({
        name: restName.trim(),
        address: restAddress.trim(),
        cityId: restCityId,
        lat: Number(restLat),
        lng: Number(restLng),
        imageUrl: restImageUrl.trim() || undefined,
        dishes: dishPayload.length ? dishPayload : undefined,
      });

      setRestaurantMessage(
        `Created "${created.name}" with ${created.dishes?.length || 0} dish(es). Live immediately.`,
      );
      setRestName('');
      setRestAddress('');
      setRestImageUrl('');
      setDishDrafts([emptyDishDraft()]);
      await loadRestaurants();
    } catch (err) {
      setRestaurantMessage(err instanceof Error ? err.message : 'Failed to create restaurant');
    } finally {
      setCreatingRestaurant(false);
    }
  };

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantId) return;
    setDishMessage(null);
    setCreatingDish(true);
    try {
      const created = await api.createRestaurantDish(selectedRestaurantId, {
        name: dishName.trim(),
        categoryId: dishCategoryId,
        category: dishCategory.trim(),
        price: dishPrice ? Number(dishPrice) : undefined,
        imageUrl: dishImageUrl.trim() || undefined,
      });
      setDishMessage(`Added "${created.name}" — approved and searchable now.`);
      setDishName('');
      setDishCategoryId('');
      setDishCategory('');
      setDishPrice('');
      setDishImageUrl('');
      await loadRestaurants();
    } catch (err) {
      setDishMessage(err instanceof Error ? err.message : 'Failed to add dish');
    } finally {
      setCreatingDish(false);
    }
  };

  const onCityChange = (id: string | null) => {
    if (!id) return;
    setRestCityId(id);
    const coords = coordsForCity(
      id,
      cities.find((c) => c.id === id)?.name,
    );
    setRestLat(String(coords.lat));
    setRestLng(String(coords.lng));
  };

  return (
    <div className="page-container py-5 md:py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <BackButton fallbackHref="/" />
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-button bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {user.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Admin workspace · listings, moderation, and your account
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingTotal > 0 && (
            <button
              type="button"
              onClick={() => setTab('inbox')}
              className="inline-flex items-center gap-2 rounded-button border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/15"
            >
              <Inbox className="h-4 w-4" aria-hidden="true" />
              {pendingTotal} awaiting review
            </button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              logout();
              router.replace('/');
            }}
          >
            <LogOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-5 rounded-card border border-border bg-surface p-3">
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Daily work
              </p>
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.group === 'work').map((item) => (
                  <li key={item.id}>
                    <NavButton
                      item={item}
                      active={tab === item.id}
                      badge={item.id === 'inbox' ? pendingTotal : undefined}
                      onClick={() => setTab(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Setup
              </p>
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.group === 'setup').map((item) => (
                  <li key={item.id}>
                    <NavButton
                      item={item}
                      active={tab === item.id}
                      onClick={() => setTab(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                You
              </p>
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.group === 'you').map((item) => (
                  <li key={item.id}>
                    <NavButton
                      item={item}
                      active={tab === item.id}
                      onClick={() => setTab(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="lg:hidden -mx-4 px-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 snap-scroll-x">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'snap-item relative shrink-0 inline-flex items-center gap-1.5 rounded-button border px-3 py-2 text-xs font-semibold transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-surface text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                  {item.id === 'inbox' && pendingTotal > 0 && (
                    <span
                      className={cn(
                        'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                        active ? 'bg-white/20' : 'bg-primary text-primary-foreground',
                      )}
                    >
                      {pendingTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-5 hidden sm:block">
            <h2 className="font-display text-xl font-bold tracking-tight">{activeNav?.label}</h2>
            <p className="text-sm text-muted-foreground">{activeNav?.hint}</p>
          </div>

          {tab === 'overview' && <AdminOverviewDashboard onGo={setTab} />}

          {tab === 'inbox' && (
            <InboxPanel
              loading={inboxLoading}
              refreshing={inboxRefreshing}
              pendingRestaurants={pendingRestaurants}
              dishes={dishes}
              reviews={reviews}
              onApproveRestaurant={handleApproveRestaurant}
              onRejectRestaurant={handleRejectRestaurant}
              onApproveDish={handleApproveDish}
              onRejectDish={handleRejectDish}
              onApproveReview={handleApproveReview}
              onRejectReview={handleRejectReview}
              onRefresh={() => void loadPending({ refresh: true })}
            />
          )}

          {tab === 'catalog' && <AdminCatalogManager />}
          {tab === 'reviews' && <AdminReviewsManager />}

          {tab === 'create' && (
            <div className="space-y-4 animate-fade-in">
              <AdminSegmentedControl
                value={createMode}
                onChange={(next) => {
                  const mode = next as 'restaurant' | 'dish';
                  setCreateMode(mode);
                  const sp = new URLSearchParams(searchParams.toString());
                  sp.set('tab', 'create');
                  sp.set('mode', mode);
                  if (mode === 'restaurant') sp.delete('restaurantId');
                  router.replace(`/admin?${sp.toString()}`, { scroll: false });
                }}
                options={[
                  { value: 'restaurant', label: 'Restaurant' },
                  { value: 'dish', label: 'Dish' },
                ]}
              />

              {createMode === 'restaurant' ? (
                <form
                  onSubmit={handleCreateRestaurant}
                  className="surface-card overflow-hidden"
                >
                  <div className="border-b border-border/70 bg-muted/30 px-4 py-3.5 sm:px-6">
                    <p className="text-sm font-medium text-foreground">New restaurant</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Approved and searchable immediately. Map pin helps Near Me and receipt verify.
                    </p>
                  </div>

                  <div className="space-y-7 p-4 sm:p-6">
                    <AdminFormSection title="Basics">
                      <div className="grid gap-4">
                        <AdminField label="Restaurant name">
                          <Input
                            value={restName}
                            onChange={(e) => setRestName(e.target.value)}
                            required
                            placeholder="e.g. Student Biryani"
                          />
                        </AdminField>
                        <AdminField label="Address">
                          <Input
                            value={restAddress}
                            onChange={(e) => setRestAddress(e.target.value)}
                            required
                            placeholder="Street, area, city"
                          />
                        </AdminField>
                      </div>
                    </AdminFormSection>

                    <AdminFormSection
                      title="Location"
                      description="City drives search filters; the map sets the exact pin."
                    >
                      <div className="grid gap-4">
                        <AdminField label="City" className="max-w-md">
                          <CitySelect
                            allowAll={false}
                            value={restCityId}
                            onChange={onCityChange}
                          />
                        </AdminField>
                        <AdminField label="Map pin">
                          <LocationPicker
                            key={restCityId}
                            value={
                              restLat && restLng
                                ? { lat: Number(restLat), lng: Number(restLng) }
                                : null
                            }
                            onChange={(pos) => {
                              setRestLat(String(pos.lat));
                              setRestLng(String(pos.lng));
                            }}
                            defaultCenter={coordsForCity(
                              restCityId,
                              cities.find((c) => c.id === restCityId)?.name,
                            )}
                            cityName={cities.find((c) => c.id === restCityId)?.name}
                            searchHint="Search place, street, or landmark…"
                          />
                        </AdminField>
                      </div>
                    </AdminFormSection>

                    <AdminFormSection title="Picture" description="Optional cover photo for the venue.">
                      <ImagePickerField
                        hideLabel
                        value={restImageUrl}
                        onChange={setRestImageUrl}
                      />
                    </AdminFormSection>

                    <AdminFormSection
                      title="Dishes"
                      description="Optional starter menu — you can add more later from Catalog."
                    >
                      <div className="mb-3 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDishDrafts((d) => [...d, emptyDishDraft()])}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add dish row
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {dishDrafts.map((draft, index) => (
                          <div
                            key={index}
                            className="rounded-button border border-border/70 bg-muted/15 p-3 sm:p-3.5"
                          >
                            <div className="grid gap-3 sm:grid-cols-[1fr_minmax(10rem,14rem)_5.5rem_auto] sm:items-end">
                              <AdminField label="Name">
                                <Input
                                  value={draft.name}
                                  onChange={(e) =>
                                    setDishDrafts((rows) =>
                                      rows.map((r, i) =>
                                        i === index ? { ...r, name: e.target.value } : r,
                                      ),
                                    )
                                  }
                                  placeholder="Dish name"
                                />
                              </AdminField>
                              <AdminField label="Category">
                                <CategorySelect
                                  valueId={draft.categoryId}
                                  valueName={draft.category}
                                  onChange={({ id, name: catName }) =>
                                    setDishDrafts((rows) =>
                                      rows.map((r, i) =>
                                        i === index
                                          ? { ...r, categoryId: id, category: catName }
                                          : r,
                                      ),
                                    )
                                  }
                                />
                              </AdminField>
                              <AdminField label="Price">
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
                              </AdminField>
                              <div className="flex justify-end sm:pb-0.5">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-11 w-11"
                                  disabled={dishDrafts.length === 1}
                                  onClick={() =>
                                    setDishDrafts((rows) => rows.filter((_, i) => i !== index))
                                  }
                                  aria-label="Remove dish row"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AdminFormSection>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    {restaurantMessage ? (
                      <p className="text-sm text-primary" role="status">
                        {restaurantMessage}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Ready when name, address, city, and map pin are set.
                      </p>
                    )}
                    <Button
                      type="submit"
                      disabled={creatingRestaurant}
                      className="w-full sm:w-auto"
                    >
                      {creatingRestaurant ? <Spinner size="sm" className="text-primary-foreground" /> : null}
                      {creatingRestaurant ? 'Creating…' : 'Create restaurant'}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateDish} className="surface-card overflow-hidden">
                  <div className="border-b border-border/70 bg-muted/30 px-4 py-3.5 sm:px-6">
                    <p className="text-sm font-medium text-foreground">New dish</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Adds an approved dish to an existing restaurant — searchable right away.
                    </p>
                  </div>

                  <div className="space-y-7 p-4 sm:p-6">
                    <AdminFormSection title="Details">
                      <div className="grid gap-4">
                        <AdminField label="Restaurant">
                          <select
                            value={selectedRestaurantId}
                            onChange={(e) => setSelectedRestaurantId(e.target.value)}
                            required
                            className={adminSelectClassName}
                          >
                            <option value="">Select restaurant</option>
                            {restaurants.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                                {r._count ? ` (${r._count.dishes} dishes)` : ''}
                              </option>
                            ))}
                          </select>
                        </AdminField>
                        <AdminField label="Dish name">
                          <Input
                            value={dishName}
                            onChange={(e) => setDishName(e.target.value)}
                            required
                            placeholder="e.g. Zinger Burger"
                          />
                        </AdminField>
                        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                          <AdminField label="Category">
                            <CategorySelect
                              valueId={dishCategoryId}
                              valueName={dishCategory}
                              onChange={({ id, name: catName }) => {
                                setDishCategoryId(id);
                                setDishCategory(catName);
                              }}
                            />
                          </AdminField>
                          <AdminField label="Price (Rs)">
                            <Input
                              type="number"
                              value={dishPrice}
                              onChange={(e) => setDishPrice(e.target.value)}
                              placeholder="650"
                            />
                          </AdminField>
                        </div>
                      </div>
                    </AdminFormSection>

                    <AdminFormSection title="Picture" description="Optional — helps diners recognize the dish.">
                      <ImagePickerField
                        hideLabel
                        value={dishImageUrl}
                        onChange={setDishImageUrl}
                      />
                    </AdminFormSection>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    {dishMessage ? (
                      <p className="text-sm text-primary" role="status">
                        {dishMessage}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {restaurants.length === 0
                          ? 'Create a restaurant first, then add dishes here.'
                          : 'Restaurant, name, and category are required.'}
                      </p>
                    )}
                    <Button
                      type="submit"
                      disabled={creatingDish || restaurants.length === 0 || !dishCategoryId}
                      className="w-full sm:w-auto"
                    >
                      {creatingDish ? <Spinner size="sm" className="text-primary-foreground" /> : null}
                      {creatingDish ? 'Adding…' : 'Add dish'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {tab === 'cities' && <AdminCitiesManager />}
          {tab === 'categories' && <AdminCategoriesManager />}
          {tab === 'permissions' && <AdminPermissionsManager />}
          {tab === 'accounts' && <AdminUsersManager />}
          {tab === 'my-reviews' && <ProfileReviewsPanel />}
          {tab === 'saved' && <ProfileSavedPanel />}
          {tab === 'account' && <ProfileAccountPanel showSignOut={false} />}
        </div>
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  badge,
  onClick,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-button px-2.5 py-2 text-left transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{item.label}</span>
        <span className="block text-[11px] text-muted-foreground truncate">{item.hint}</span>
      </span>
      {!!badge && badge > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
}

function InboxPanel({
  loading,
  refreshing,
  pendingRestaurants,
  dishes,
  reviews,
  onApproveRestaurant,
  onRejectRestaurant,
  onApproveDish,
  onRejectDish,
  onApproveReview,
  onRejectReview,
  onRefresh,
}: {
  loading?: boolean;
  refreshing?: boolean;
  pendingRestaurants: PendingRestaurant[];
  dishes: Dish[];
  reviews: Review[];
  onApproveRestaurant: (id: string, edits?: RestaurantApproveEdits) => void | Promise<void>;
  onRejectRestaurant: (id: string) => void | Promise<void>;
  onApproveDish: (id: string, edits?: DishApproveEdits) => void | Promise<void>;
  onRejectDish: (id: string) => void | Promise<void>;
  onApproveReview: (id: string) => void | Promise<void>;
  onRejectReview: (id: string) => void | Promise<void>;
  onRefresh: () => void;
}) {
  const [reviewTarget, setReviewTarget] = useState<InboxReviewTarget | null>(null);
  const [acting, setActing] = useState(false);

  const empty =
    pendingRestaurants.length === 0 && dishes.length === 0 && reviews.length === 0;

  if (loading) {
    return (
      <PanelLoading
        label="Loading inbox…"
        hint="Fetching pending restaurants, dishes, and reviews"
        rows={4}
        rowHeight="h-20"
      />
    );
  }

  const closeReview = () => setReviewTarget(null);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={refreshing}
          onClick={onRefresh}
        >
          {refreshing ? <Spinner size="sm" className="text-muted-foreground" /> : null}
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {empty ? (
        <div className="rounded-card border border-dashed border-border py-12 text-center">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium">Inbox is clear</p>
          <p className="mt-1 text-sm text-muted-foreground">No pending restaurants, dishes, or reviews.</p>
        </div>
      ) : (
        <>
          <InboxSection title={`Restaurants (${pendingRestaurants.length})`}>
            {pendingRestaurants.length === 0 ? (
              <EmptyLine text="No pending restaurants." />
            ) : (
              pendingRestaurants.map((r) => (
                <InboxCard
                  key={r.id}
                  title={r.name}
                  subtitle={formatFullAddress(r.address, r.city)}
                  meta={`${r._count?.dishes ?? r.dishes?.length ?? 0} dish(es)${
                    r.dishes?.length
                      ? `: ${r.dishes.map((d) => d.name).join(', ')}`
                      : ''
                  }`}
                  imageUrl={r.imageUrl}
                  onReview={() => setReviewTarget({ kind: 'restaurant', restaurant: r })}
                />
              ))
            )}
          </InboxSection>

          <InboxSection title={`Dishes (${dishes.length})`}>
            {dishes.length === 0 ? (
              <EmptyLine text="No pending dishes." />
            ) : (
              dishes.map((d) => {
                const restaurant = d.restaurant as
                  | (Restaurant & {
                      city?: { name: string; province?: string | null } | null;
                    })
                  | undefined;
                return (
                  <InboxCard
                    key={d.id}
                    title={d.name}
                    subtitle={restaurant?.name || 'Unknown restaurant'}
                    meta={[
                      d.category,
                      formatFullAddress(restaurant?.address, restaurant?.city),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    imageUrl={d.imageUrl}
                    onReview={() => setReviewTarget({ kind: 'dish', dish: d })}
                  />
                );
              })
            )}
          </InboxSection>

          <InboxSection title={`Reviews (${reviews.length})`}>
            {reviews.length === 0 ? (
              <EmptyLine text="No pending reviews." />
            ) : (
              reviews.map((r) => {
                const restaurant = r.dish?.restaurant as
                  | (Restaurant & {
                      city?: { name: string; province?: string | null } | null;
                    })
                  | undefined;
                return (
                  <InboxCard
                    key={r.id}
                    title={`${r.user?.name || 'User'} · ${r.rating}★`}
                    subtitle={r.text || 'No comment'}
                    meta={[
                      r.dish?.name,
                      restaurant?.name,
                      formatFullAddress(restaurant?.address, restaurant?.city),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    onReview={() => setReviewTarget({ kind: 'review', review: r })}
                  />
                );
              })
            )}
          </InboxSection>
        </>
      )}

      <InboxReviewDialog
        open={!!reviewTarget}
        target={reviewTarget}
        busy={acting}
        onOpenChange={(next) => {
          if (!next) closeReview();
        }}
        onApproveRestaurant={async (edits) => {
          if (!reviewTarget || reviewTarget.kind !== 'restaurant') return;
          setActing(true);
          try {
            await onApproveRestaurant(reviewTarget.restaurant.id, edits);
          } finally {
            setActing(false);
          }
        }}
        onApproveDish={async (edits) => {
          if (!reviewTarget || reviewTarget.kind !== 'dish') return;
          setActing(true);
          try {
            await onApproveDish(reviewTarget.dish.id, edits);
          } finally {
            setActing(false);
          }
        }}
        onApproveReview={async () => {
          if (!reviewTarget || reviewTarget.kind !== 'review') return;
          setActing(true);
          try {
            await onApproveReview(reviewTarget.review.id);
          } finally {
            setActing(false);
          }
        }}
        onReject={async () => {
          if (!reviewTarget) return;
          setActing(true);
          try {
            if (reviewTarget.kind === 'restaurant') {
              await onRejectRestaurant(reviewTarget.restaurant.id);
            } else if (reviewTarget.kind === 'dish') {
              await onRejectDish(reviewTarget.dish.id);
            } else {
              await onRejectReview(reviewTarget.review.id);
            }
          } finally {
            setActing(false);
          }
        }}
      />
    </div>
  );
}

function InboxSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 font-display text-base font-bold">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function InboxCard({
  title,
  subtitle,
  meta,
  imageUrl,
  onReview,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  imageUrl?: string | null;
  onReview: () => void;
}) {
  return (
    <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-button border border-border/70 bg-muted">
          <MediaImage src={imageUrl} alt="" fill />
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">{title}</p>
          <p className="text-sm text-muted-foreground leading-snug">{subtitle}</p>
          {meta && <p className="mt-1 text-xs text-muted-foreground leading-snug">{meta}</p>}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" onClick={onReview}>
          Review
        </Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container py-10">
          <PanelLoading label="Loading admin…" hint="Preparing your workspace" rows={3} />
        </div>
      }
    >
      <AdminPageInner />
    </Suspense>
  );
}
