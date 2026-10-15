import type { Review } from '@dishrank/shared';
import { StarRating } from '@/features/reviews/star-rating';
import { GeneralReviewBadge, VerifiedBadge } from '@/features/reviews/verified-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BadgeCheck, MapPin } from 'lucide-react';

interface ReviewCardProps {
  review: Review;
  /** Shown for the author’s own unverified reviews when receipt verify is available */
  onVerify?: () => void;
  /** Hide author row (e.g. on My Reviews where it’s always you). Default true. */
  showAuthor?: boolean;
}

export function ReviewCard({ review, onVerify, showAuthor = true }: ReviewCardProps) {
  const dishName = review.dish?.name;
  const restaurantName = review.dish?.restaurant?.name;
  const cityName = review.dish?.restaurant?.city?.name;
  const placeLine = [restaurantName, cityName].filter(Boolean).join(' · ');
  const statusBadge = review.verified ? <VerifiedBadge /> : <GeneralReviewBadge />;

  return (
    <article
      className={cn(
        'rounded-card border bg-surface px-3 py-2.5',
        review.verified ? 'border-success/25 bg-success/[0.04]' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showAuthor && (
            <div className="mb-1.5 flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {(review.user?.name || 'A').charAt(0)}
              </div>
              <span className="truncate text-xs font-medium text-foreground">
                {review.user?.name || 'Anonymous'}
              </span>
              {statusBadge}
            </div>
          )}

          {dishName ? (
            <h3 className="truncate text-sm font-semibold leading-snug text-foreground">
              {dishName}
            </h3>
          ) : null}

          {placeLine ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
              <span className="truncate">{placeLine}</span>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <StarRating rating={review.rating} size="sm" />
          <time className="text-[11px] tabular-nums text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString()}
          </time>
          {!showAuthor && statusBadge}
        </div>
      </div>

      {review.text ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-foreground/90">
          {review.text}
        </p>
      ) : null}

      {onVerify && !review.verified ? (
        <div className="mt-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-primary hover:text-primary"
            onClick={onVerify}
          >
            <BadgeCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Verify with receipt
          </Button>
        </div>
      ) : null}
    </article>
  );
}
