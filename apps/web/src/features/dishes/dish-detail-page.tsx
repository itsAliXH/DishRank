'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Dish, Review } from '@dishrank/shared';
import { StarRating } from '@/features/reviews/star-rating';
import { ReviewCard } from '@/features/reviews/review-card';
import { TrendingDishCard } from '@/features/dishes/trending-dish-card';
import { ReviewFormDialog } from '@/features/reviews/review-form-dialog';
import { VerifyDialog } from '@/features/reviews/verify-dialog';
import { AuthDialog } from '@/features/auth/auth-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDishById, getReviewsForDish } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-context';
import { Share2, Star } from 'lucide-react';
import { BackButton } from '@/components/shell/back-button';
import { SaveButton } from '@/features/bookmarks/save-button';
import { MediaImage } from '@/features/dishes/media-image';
import { SkeletonBlocks } from '@/components/ui/loading';

export default function DishDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, useMockAuth } = useAuth();
  const [dish, setDish] = useState<(Dish & { reviews?: Review[] }) | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Dish[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [verifyReviewId, setVerifyReviewId] = useState('');
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [loading, setLoading] = useState(true);

  const reloadDish = useCallback(async () => {
    if (useMockAuth) {
      const d = getDishById(id);
      setDish(d || null);
      setReviews(getReviewsForDish(id));
      return;
    }
    const data = await api.getDish(id);
    setDish(data);
    setReviews(data.reviews || []);
  }, [id, useMockAuth]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (!useMockAuth) {
          const data = await api.getDish(id);
          setDish(data);
          setReviews(data.reviews || []);
          try {
            setRelated(await api.getRelatedDishes(id));
          } catch {
            setRelated([]);
          }
        } else {
          const d = getDishById(id);
          setDish(d || null);
          setReviews(getReviewsForDish(id));
          setRelated([]);
        }
      } catch {
        if (useMockAuth) {
          const d = getDishById(id);
          setDish(d || null);
          setReviews(getReviewsForDish(id));
        } else {
          setDish(null);
          setReviews([]);
          setRelated([]);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, useMockAuth]);

  const openVerify = (reviewId: string) => {
    setVerifyReviewId(reviewId);
    setVerifyOpen(true);
    setShowVerifyPrompt(false);
  };

  if (loading) {
    return (
      <div className="page-container py-6">
        <BackButton />
        <div className="space-y-4 animate-fade-in" role="status" aria-busy="true">
          <div className="flex items-center gap-3 rounded-card border border-border/70 bg-surface px-3.5 py-3 shadow-soft">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
              <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            </span>
            <p className="text-sm font-medium text-foreground">Loading dish…</p>
          </div>
          <div className="aspect-[16/10] sm:aspect-[2/1] skeleton-shimmer" />
          <div className="h-8 w-2/3 skeleton-shimmer rounded-button" />
          <div className="h-4 w-1/3 skeleton-shimmer rounded-button" />
          <SkeletonBlocks count={2} heightClass="h-24" />
        </div>
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="page-container py-6">
        <BackButton />
        <div className="py-10 text-center">
          <p className="text-muted-foreground mb-4">Dish not found</p>
          <Link href="/"><Button>Back to Search</Button></Link>
        </div>
      </div>
    );
  }

  const canVerifyAtRestaurant = dish.restaurant?.receiptVerifyEnabled !== false;
  const allowGeneral = dish.restaurant?.allowGeneralReviews !== false;
  const requireOnSite = dish.restaurant?.requireOnSiteLocation !== false;
  const verifiedOnly = canVerifyAtRestaurant && !allowGeneral;
  const reviewsEnabled = dish.restaurant?.reviewsEnabled !== false;

  const isOwnUnverified = (r: Review) =>
    !!user &&
    canVerifyAtRestaurant &&
    !r.verified &&
    r.status !== 'PENDING' &&
    (r.userId === user.id || r.user?.id === user.id);

  const verifiedReviews = reviews.filter((r) => r.verified);
  const generalReviews = reviews.filter((r) => !r.verified);
  const ownUnverified = reviews.find(isOwnUnverified);
  const showVerifyBanner =
    canVerifyAtRestaurant && (showVerifyPrompt || !!ownUnverified || (verifiedOnly && !!verifyReviewId));

  return (
    <div className="page-container py-5 md:py-8 pb-28 md:pb-8">
      <BackButton />
      <div className="flex flex-col md:flex-row gap-5 md:gap-6 mb-8">
        <div className="relative aspect-[16/10] sm:aspect-[4/3] md:aspect-auto md:h-72 md:w-2/5 rounded-card overflow-hidden bg-muted shrink-0 flex items-center justify-center">
          <MediaImage src={dish.imageUrl} alt={dish.name} fill />
        </div>
        <div className="md:w-3/5">
          {dish.category && (
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
              {dish.category}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{dish.name}</h1>
          <Link
            href={`/restaurants/${dish.restaurantId}`}
            className="text-muted-foreground hover:text-primary mt-1 inline-block"
          >
            {dish.restaurant?.name}
          </Link>
          <div className="mt-3">
            <StarRating rating={dish.avgRating} size="md" showValue reviewCount={dish.reviewCount} />
          </div>
          {dish.price && (
            <p className="mt-2 text-lg font-semibold">Rs. {dish.price}</p>
          )}
          <div className="hidden md:flex gap-2 mt-6">
            {reviewsEnabled ? (
              <Button onClick={() => setReviewOpen(true)}>
                <Star className="h-4 w-4 mr-1" aria-hidden="true" />
                Rate this dish
              </Button>
            ) : (
              <p className="self-center text-sm text-muted-foreground">
                Ratings are turned off for this restaurant.
              </p>
            )}
            <SaveButton dishId={id} />
            <Button variant="outline"><Share2 className="h-4 w-4 mr-1" aria-hidden="true" />Share</Button>
          </div>
        </div>
      </div>

      {!reviewsEnabled && (
        <p className="mb-4 text-xs text-muted-foreground">
          This restaurant is not accepting new ratings right now.
        </p>
      )}

      {reviewsEnabled && (
        <p className="mb-4 text-xs text-muted-foreground">
          {verifiedOnly ? (
            <>
              This venue accepts <span className="font-medium text-foreground">Verified</span>{' '}
              reviews only — upload an on-site receipt; an admin approves before it goes public.
            </>
          ) : canVerifyAtRestaurant ? (
            <>
              <span className="font-medium text-foreground">Verified</span> = rating + receipt
              (admin approves). <span className="font-medium text-foreground">General</span> =
              rating without a receipt.
            </>
          ) : (
            <>
              Reviews here are <span className="font-medium text-foreground">General</span> only —
              no receipt step.
            </>
          )}
        </p>
      )}

      {showVerifyBanner && (
        <div className="mb-6 p-4 rounded-card border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm">
            {verifiedOnly
              ? 'Upload your on-site receipt (~1 km) next. Your review stays private until an admin approves it.'
              : reviews.filter(isOwnUnverified).length > 1
                ? 'You have General reviews. Add a receipt to request Verified (admin approves), or leave them as General.'
                : 'Your review is General. Add a receipt to request Verified (admin approves) — or keep it as General.'}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => openVerify(ownUnverified?.id || verifyReviewId)}
              disabled={!ownUnverified && !verifyReviewId}
            >
              {verifiedOnly ? 'Upload receipt' : 'Verify with receipt'}
            </Button>
            {showVerifyPrompt && allowGeneral && (
              <Button size="sm" variant="ghost" onClick={() => setShowVerifyPrompt(false)}>
                Keep as General
              </Button>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({reviews.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({verifiedReviews.length})</TabsTrigger>
          <TabsTrigger value="general">General ({generalReviews.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-3 mt-4">
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No reviews yet. Be the first!</p>
          ) : (
            reviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                onVerify={isOwnUnverified(r) ? () => openVerify(r.id) : undefined}
              />
            ))
          )}
        </TabsContent>
        <TabsContent value="verified" className="space-y-3 mt-4">
          {verifiedReviews.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No verified reviews yet.</p>
          ) : (
            verifiedReviews.map((r) => <ReviewCard key={r.id} review={r} />)
          )}
        </TabsContent>
        <TabsContent value="general" className="space-y-3 mt-4">
          {generalReviews.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No general reviews yet.</p>
          ) : (
            generalReviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                onVerify={isOwnUnverified(r) ? () => openVerify(r.id) : undefined}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Other top {dish.category} nearby</h2>
          <div className="snap-scroll-x md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {related.map((d) => (
              <div key={d.id} className="snap-item shrink-0 w-[42vw] sm:w-44 md:w-auto">
                <TrendingDishCard dish={d} />
              </div>
            ))}
          </div>
        </section>
      )}

      {reviewsEnabled && (
        <div
          className="glass-nav fixed left-0 right-0 p-3 md:hidden flex gap-2 pb-safe"
          style={{ bottom: 'var(--bottom-nav-height)' }}
        >
          <Button className="flex-1" onClick={() => setReviewOpen(true)}>
            <Star className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Rate
          </Button>
          <SaveButton dishId={id} className="flex-1" />
          <Button variant="outline" size="icon" className="shrink-0">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ReviewFormDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        dishId={id}
        dishName={dish.name}
        restaurantName={dish.restaurant?.name}
        canVerify={canVerifyAtRestaurant}
        allowGeneral={allowGeneral}
        requireOnSite={requireOnSite}
        onSuccess={async ({ reviewId, withReceipt }) => {
          setVerifyReviewId(reviewId);
          // Receipt already uploaded in the rate popup — no second verify step.
          if (withReceipt) {
            setShowVerifyPrompt(false);
          } else if (canVerifyAtRestaurant && allowGeneral) {
            // Optional later verify for General → Verified upgrade
            setShowVerifyPrompt(true);
          }
          try {
            await reloadDish();
          } catch {
            /* keep previous list */
          }
        }}
        onLoginRequired={() => {
          setReviewOpen(false);
          setAuthOpen(true);
        }}
      />
      <VerifyDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        reviewId={verifyReviewId}
        restaurantName={dish.restaurant?.name || ''}
        requireOnSite={requireOnSite}
        onSuccess={async () => {
          setShowVerifyPrompt(false);
          setVerifyReviewId('');
          try {
            await reloadDish();
          } catch {
            /* keep previous list */
          }
        }}
      />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} redirectStaff={false} />
    </div>
  );
}
