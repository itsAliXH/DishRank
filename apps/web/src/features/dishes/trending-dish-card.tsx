'use client';

import Link from 'next/link';
import type { Dish } from '@dishrank/shared';
import { StarRating } from '@/features/reviews/star-rating';
import { SaveButton } from '@/features/bookmarks/save-button';
import { MediaImage } from '@/features/dishes/media-image';
import { cn } from '@/lib/utils';

const PLACEHOLDER_TONES = [
  'from-[#D61F4A]/90 to-[#7F1233]',
  'from-[#1B3A5F] to-[#0F243D]',
  'from-[#C45C26] to-[#7A3416]',
  'from-[#334155] to-[#1E293B]',
  'from-[#9F1239] to-[#4C0519]',
] as const;

function toneFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % PLACEHOLDER_TONES.length;
  return PLACEHOLDER_TONES[hash];
}

export function TrendingDishCard({
  dish,
  className,
  showSave = true,
}: {
  dish: Dish;
  className?: string;
  showSave?: boolean;
}) {
  const hasReviews = (dish.reviewCount ?? 0) > 0;

  return (
    <Link href={`/dishes/${dish.id}`} className={cn('group block w-full', className)}>
      <article className="h-full overflow-hidden rounded-card bg-surface border border-border/70 shadow-soft transition-all duration-300 ease-soft group-hover:-translate-y-1.5 group-hover:border-primary/30 group-hover:shadow-lift active:scale-[0.98]">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {dish.imageUrl ? (
            <MediaImage
              src={dish.imageUrl}
              alt={dish.name}
              fill
              className="transition-transform duration-700 ease-soft group-hover:scale-[1.06]"
              placeholderClassName={cn('bg-gradient-to-br', toneFor(dish.id || dish.name))}
            />
          ) : (
            <div
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br text-white',
                toneFor(dish.id || dish.name),
              )}
              aria-hidden="true"
            >
              {dish.name && (
                <span className="mt-1 px-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  {dish.name}
                </span>
              )}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          {dish.category && dish.imageUrl && (
            <span className="absolute bottom-2 left-2 rounded-button bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition-transform duration-300 group-hover:translate-y-[-1px]">
              {dish.category}
            </span>
          )}
          {showSave && (
            <div className="absolute top-2 right-2 opacity-95 transition-transform duration-300 group-hover:scale-105">
              <SaveButton dishId={dish.id} variant="card" stopPropagation />
            </div>
          )}
        </div>
        <div className="p-3.5">
          <h3 className="font-display text-[0.95rem] font-bold leading-snug truncate transition-colors duration-200 group-hover:text-primary">
            {dish.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-1">{dish.restaurant?.name}</p>
          <div className="mt-2.5">
            {hasReviews ? (
              <StarRating
                rating={dish.avgRating}
                size="sm"
                showValue
                reviewCount={dish.reviewCount}
              />
            ) : (
              <p className="text-xs font-medium text-primary/90">New · be the first to rate</p>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
