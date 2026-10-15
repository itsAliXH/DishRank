'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
  return (
    <Loader2
      className={cn('animate-spin text-primary', sizeClass, className)}
      aria-hidden="true"
    />
  );
}

/** Centered panel loader with message — use when a whole section is fetching. */
export function LoadingState({
  label = 'Loading…',
  hint,
  className,
  compact,
}: {
  label?: string;
  hint?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center text-center animate-fade-in',
        compact ? 'gap-2.5 py-10' : 'gap-3 py-14 sm:py-16',
        className,
      )}
    >
      <span className="relative flex h-11 w-11 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-[2.5px] border-primary/15" />
        <span className="absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-primary animate-spin" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground max-w-xs mx-auto">{hint}</p> : null}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Soft shimmer blocks that match card layout while data loads. */
export function SkeletonBlocks({
  count = 3,
  heightClass = 'h-20',
  className,
}: {
  count?: number;
  heightClass?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cn('skeleton-shimmer', heightClass)}
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

/** Combo: spinner banner + shimmer rows for list screens. */
export function PanelLoading({
  label = 'Loading…',
  hint,
  rows = 3,
  rowHeight = 'h-20',
}: {
  label?: string;
  hint?: string;
  rows?: number;
  rowHeight?: string;
}) {
  return (
    <div className="space-y-4 animate-fade-in" role="status" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3 rounded-card border border-border/70 bg-surface px-3.5 py-3 shadow-soft">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      <SkeletonBlocks count={rows} heightClass={rowHeight} />
    </div>
  );
}
