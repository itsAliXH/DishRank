'use client';

import Link from 'next/link';
import type { Dish } from '@dishrank/shared';
import { StarRating } from '@/features/reviews/star-rating';
import { MediaImage } from '@/features/dishes/media-image';
import { ChevronRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DishResultCardProps {
  dish: Dish;
  distanceKm?: number | null;
  className?: string;
}

export function DishResultCard({ dish, distanceKm, className }: DishResultCardProps) {
  return (
    <Link href={`/dishes/${dish.id}`} className={cn('group block', className)}>
      <article className="flex gap-3 p-3 sm:p-4 surface-card transition-all duration-300 ease-soft group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-lift active:scale-[0.99]">
        <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
          <MediaImage
            src={dish.imageUrl}
            alt={dish.name}
            fill
            className="transition-transform duration-500 ease-soft group-hover:scale-[1.05]"
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-foreground truncate transition-colors duration-200 group-hover:text-primary">
                {dish.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate">{dish.restaurant?.name}</p>
            </div>
            <ChevronRight
              className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform duration-200 group-hover:translate-x-0.5 md:hidden"
              aria-hidden="true"
            />
          </div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
            <StarRating rating={dish.avgRating} size="sm" showValue reviewCount={dish.reviewCount} />
            {distanceKm != null && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {distanceKm.toFixed(1)} km
              </span>
            )}
            {dish.price != null && (
              <span className="text-xs font-semibold text-foreground">Rs. {dish.price}</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
