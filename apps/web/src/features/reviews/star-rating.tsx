'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
  reviewCount?: number;
}

export function StarRating({
  rating,
  size = 'md',
  interactive = false,
  onChange,
  showValue = false,
  reviewCount,
}: StarRatingProps) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-8 w-8' }[size];

  return (
    <div className="flex items-center gap-1" role="img" aria-label={`Rating: ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          className={cn(
            interactive && 'cursor-pointer hover:scale-110 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center',
            !interactive && 'cursor-default',
          )}
          aria-label={interactive ? `Rate ${star} stars` : undefined}
        >
          <Star
            className={cn(
              sizeClass,
              star <= Math.round(rating)
                ? 'fill-primary text-primary'
                : 'fill-none text-gray-300',
            )}
          />
        </button>
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-semibold text-foreground">
          {rating.toFixed(1)}
          {reviewCount !== undefined && (
            <span className="font-normal text-muted-foreground"> ({reviewCount})</span>
          )}
        </span>
      )}
    </div>
  );
}
