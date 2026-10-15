'use client';

import { useRouter } from 'next/navigation';
import {
  Beef,
  Coffee,
  Cookie,
  Fish,
  IceCream,
  Pizza,
  Salad,
  Soup,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /biryani|pulao|rice/i, icon: Soup },
  { match: /burger|beef|mutton|chicken|karahi|nihari|haleem|bbq|kabab/i, icon: Beef },
  { match: /pizza|pasta/i, icon: Pizza },
  { match: /fish|seafood/i, icon: Fish },
  { match: /dessert|sweet/i, icon: IceCream },
  { match: /drink|chai|coffee/i, icon: Coffee },
  { match: /paratha|breakfast|sandwich|shawarma/i, icon: Cookie },
  { match: /salad|chinese|thai|veg/i, icon: Salad },
];

const TILE_TONES = [
  'bg-[#FFF0F3] text-[#BE123C] border-[#FECDD3]',
  'bg-[#E8EEF5] text-[#1B3A5F] border-[#C5D0E0]',
  'bg-[#FFF4EB] text-[#C45C26] border-[#F5D0B5]',
  'bg-[#F1F3F6] text-[#334155] border-[#D0D5DD]',
  'bg-[#FDF2F8] text-[#9D174D] border-[#FBCFE8]',
  'bg-[#EEF4FF] text-[#1D4ED8] border-[#C7D7FE]',
] as const;

function iconFor(term: string): LucideIcon {
  return CATEGORY_ICONS.find((c) => c.match.test(term))?.icon ?? UtensilsCrossed;
}

function toneFor(term: string) {
  let hash = 0;
  for (let i = 0; i < term.length; i++) hash = (hash + term.charCodeAt(i) * (i + 1)) % TILE_TONES.length;
  return TILE_TONES[hash];
}

export function PopularSearchTiles({ terms }: { terms: string[] }) {
  const router = useRouter();
  if (!terms.length) return null;

  return (
    <section className="mt-8 md:mt-10 animate-fade-up stagger-3">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="section-label">Popular right now</h2>
          <p className="text-sm text-muted-foreground mt-1">Jump into what people search most</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {terms.slice(0, 10).map((term) => {
          const Icon = iconFor(term);
          return (
            <button
              key={term}
              type="button"
              onClick={() =>
                router.push(`/search?q=${encodeURIComponent(term)}&type=dish&sort=rating`)
              }
              className={cn(
                'group flex items-center gap-2.5 rounded-button border px-3 py-3 text-left transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-soft active:scale-[0.98]',
                toneFor(term),
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-white/70 transition-transform duration-300 ease-soft group-hover:scale-105">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-tight">{term}</span>
                <span className="block text-[11px] opacity-70 transition-opacity duration-200 group-hover:opacity-100">
                  Search →
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
