'use client';

import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppSplash({
  visible,
  exiting,
  progress,
}: {
  visible: boolean;
  exiting: boolean;
  /** 0–100 fill for the progress bar */
  progress: number;
}) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center',
        'bg-[#B01538]',
        'transition-[opacity,transform] duration-700 ease-soft will-change-[opacity,transform]',
        exiting
          ? 'pointer-events-none -translate-y-2 opacity-0'
          : 'translate-y-0 opacity-100',
      )}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label="Loading DishRank"
    >
      {/* Soft static atmosphere — no looping motion (avoids “laggy” feel) */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 35%, rgba(255,255,255,0.14), transparent 55%), linear-gradient(160deg, #D61F4A 0%, #9F1239 48%, #1B3A5F 100%)',
        }}
      />

      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="mb-6 flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-[1.35rem] bg-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.4)] animate-splash-mark">
          <UtensilsCrossed className="h-9 w-9 text-primary" aria-hidden="true" />
        </div>

        <p
          className="font-display text-4xl font-bold tracking-tight text-white sm:text-[2.75rem] animate-splash-rise"
          style={{ animationDelay: '90ms' }}
        >
          DishRank
        </p>

        <p
          className="mt-2.5 text-sm font-medium text-white/80 animate-splash-rise sm:text-[0.95rem]"
          style={{ animationDelay: '160ms' }}
        >
          Find the best dish near you
        </p>

        <div
          className="mt-9 h-1 w-40 overflow-hidden rounded-full bg-white/20 animate-splash-rise"
          style={{ animationDelay: '240ms' }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-white transition-[width] duration-500 ease-soft"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
