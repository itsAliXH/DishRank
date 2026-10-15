'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCity } from '@/providers/city-context';
import { api } from '@/lib/api';
import {
  getStoredSearchType,
  setStoredSearchType,
  type SearchType,
} from '@/lib/search-prefs';

interface SearchBarProps {
  defaultQuery?: string;
  defaultType?: SearchType;
  className?: string;
  size?: 'default' | 'large';
  variant?: 'default' | 'compact';
  /** Use on dark / image heroes — renders as a solid light search panel */
  tone?: 'default' | 'onDark';
}

type Suggestion =
  | { kind: 'category'; id: string; label: string }
  | { kind: 'dish'; id: string; label: string; subtitle?: string }
  | { kind: 'restaurant'; id: string; label: string; subtitle?: string };

function isStrongMatch(label: string, q: string): boolean {
  const a = label.toLowerCase().trim();
  const b = q.toLowerCase().trim();
  if (!b) return false;
  return a === b || a.startsWith(b) || a.includes(b);
}

function sortStrongFirst(items: Suggestion[], q: string): Suggestion[] {
  return [...items].sort((x, y) => {
    const xs = isStrongMatch(x.label, q) ? 0 : 1;
    const ys = isStrongMatch(y.label, q) ? 0 : 1;
    return xs - ys;
  });
}

export function SearchBar({
  defaultQuery = '',
  defaultType = 'dish',
  className,
  size = 'default',
  variant = 'default',
  tone = 'default',
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { cityId } = useCity();
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const urlQuery =
    pathname === '/search' || pathname === '/near-me'
      ? searchParams.get('q') || ''
      : defaultQuery;
  const urlType: SearchType =
    pathname === '/search' || pathname === '/near-me'
      ? searchParams.get('type') === 'restaurant'
        ? 'restaurant'
        : 'dish'
      : defaultType;

  const [query, setQuery] = useState(urlQuery);
  const [type, setType] = useState<SearchType>(urlType);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    setQuery(urlQuery);
    setType(urlType);
  }, [urlQuery, urlType]);

  useEffect(() => {
    if (pathname === '/search' || pathname === '/near-me') return;
    setType(getStoredSearchType());
  }, [pathname]);

  const selectType = (next: SearchType) => {
    setType(next);
    setSuggestions([]);
    setStoredSearchType(next);
    if (pathname === '/near-me') {
      const params = new URLSearchParams(searchParams.toString());
      params.set('type', next);
      router.replace(`/near-me?${params.toString()}`);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const q = query.trim();
        if (type === 'restaurant') {
          const list = await api.suggestRestaurants(q || undefined, cityId || undefined);
          if (cancelled) return;
          setSuggestions(
            sortStrongFirst(
              list.map((r) => ({
                kind: 'restaurant' as const,
                id: r.id,
                label: r.name,
                subtitle: [r.address, r.city?.name].filter(Boolean).join(' · ') || undefined,
              })),
              q,
            ),
          );
        } else {
          const [categories, dishes] = await Promise.all([
            api.searchCategories(q || undefined),
            q
              ? api.search({
                  type: 'dish',
                  q,
                  cityId: cityId || undefined,
                  sort: 'rating',
                })
              : Promise.resolve([]),
          ]);
          if (cancelled) return;

          const catItems: Suggestion[] = (categories as { id: string; name: string }[])
            .slice(0, 6)
            .map((c) => ({
              kind: 'category' as const,
              id: c.id,
              label: c.name,
            }));

          const seenNames = new Set(catItems.map((c) => c.label.toLowerCase()));
          const dishItems: Suggestion[] = [];
          for (const d of dishes as {
            id: string;
            name: string;
            restaurant?: { name?: string };
          }[]) {
            const key = d.name.toLowerCase();
            if (seenNames.has(key)) continue;
            seenNames.add(key);
            dishItems.push({
              kind: 'dish',
              id: d.id,
              label: d.name,
              subtitle: d.restaurant?.name,
            });
            if (dishItems.length >= 6) break;
          }

          setSuggestions(sortStrongFirst([...catItems, ...dishItems].slice(0, 10), q));
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, type, cityId]);

  const placeholder =
    type === 'restaurant'
      ? size === 'large'
        ? 'Which restaurant are you looking for?'
        : 'Search restaurants…'
      : size === 'large'
        ? 'What are you craving?'
        : 'Search dishes…';

  const goSearch = (q: string, searchType: SearchType = type) => {
    const trimmed = q.trim();
    setStoredSearchType(searchType);
    if (pathname === '/near-me') {
      const params = new URLSearchParams();
      params.set('type', searchType);
      if (trimmed) params.set('q', trimmed);
      setOpen(false);
      router.push(`/near-me?${params.toString()}`);
      return;
    }
    const params = new URLSearchParams({
      type: searchType,
      sort: 'rating',
    });
    if (trimmed) params.set('q', trimmed);
    if (cityId) params.set('cityId', cityId);
    setOpen(false);
    router.push(`/search?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goSearch(query);
  };

  const pick = (s: Suggestion) => {
    setQuery(s.label);
    setOpen(false);
    if (s.kind === 'restaurant') {
      router.push(`/restaurants/${s.id}`);
      return;
    }
    if (s.kind === 'dish') {
      router.push(`/dishes/${s.id}`);
      return;
    }
    goSearch(s.label, 'dish');
  };

  const onDark = tone === 'onDark';
  const large = size === 'large';

  const trimmedQuery = query.trim();
  const hasStrongMatch =
    trimmedQuery.length > 0 &&
    suggestions.some((s) => isStrongMatch(s.label, trimmedQuery));
  const showAddCta =
    open && !loading && trimmedQuery.length > 0 && !hasStrongMatch;

  const addHref =
    type === 'restaurant'
      ? `/add-dish?mode=restaurant&name=${encodeURIComponent(trimmedQuery)}`
      : `/add-dish?mode=dish&name=${encodeURIComponent(trimmedQuery)}`;

  const addLabel =
    type === 'restaurant'
      ? `Add restaurant “${trimmedQuery}”`
      : `Add dish “${trimmedQuery}”`;

  const showDropdown = open && (loading || suggestions.length > 0 || showAddCta);

  const dropdown = showDropdown ? (
    <ul
      id={listId}
      role="listbox"
      className="absolute left-0 right-0 top-full z-[80] mt-1.5 max-h-72 overflow-y-auto overscroll-contain rounded-card border border-border bg-surface shadow-lift animate-slide-up"
      onMouseDown={(e) => e.preventDefault()}
    >
      {loading && suggestions.length === 0 && (
        <li className="px-3.5 py-2.5 text-xs text-muted-foreground">Searching…</li>
      )}
      {suggestions.map((s) => (
        <li key={`${s.kind}-${s.id}`} className="border-b border-border/60 last:border-0">
          <button
            type="button"
            role="option"
            className="w-full px-3.5 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-muted/70"
            onClick={() => pick(s)}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-foreground truncate">{s.label}</span>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {s.kind === 'category' ? 'Category' : s.kind === 'dish' ? 'Dish' : 'Restaurant'}
              </span>
            </span>
            {s.kind !== 'category' && s.subtitle && (
              <span className="mt-0.5 block text-[11px] text-muted-foreground truncate">
                {s.subtitle}
              </span>
            )}
          </button>
        </li>
      ))}
      {showAddCta && (
        <li className="border-t border-border bg-muted/30">
          <p className="px-3.5 pt-2.5 pb-1 text-xs text-muted-foreground">
            {suggestions.length > 0
              ? `No exact match for “${trimmedQuery}”`
              : `No matches for “${trimmedQuery}”`}
          </p>
          <button
            type="button"
            className="w-full px-3.5 py-2.5 text-left text-sm font-semibold text-primary hover:bg-primary/5"
            onClick={() => {
              setOpen(false);
              router.push(addHref);
            }}
          >
            {addLabel}
          </button>
        </li>
      )}
    </ul>
  ) : null;

  const inputHandlers = {
    onFocus: () => setOpen(true),
    onBlur: () => {
      blurTimer.current = setTimeout(() => setOpen(false), 150);
    },
    onChange: (value: string) => {
      setQuery(value);
      setOpen(true);
    },
  };

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className={cn('relative z-[80] w-full', className)}>
        <div className="flex items-center gap-1 rounded-card border border-border bg-surface p-1 shadow-soft transition-[box-shadow,border-color] duration-200 focus-within:border-primary/30 focus-within:shadow-glow">
          <div className="flex shrink-0 rounded-button bg-muted p-0.5">
            {(['dish', 'restaurant'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => selectType(t)}
                className={cn(
                  'rounded-button px-2.5 py-1 text-xs font-semibold capitalize transition-all duration-200 ease-soft',
                  type === t
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={type === t}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => inputHandlers.onChange(e.target.value)}
              onFocus={inputHandlers.onFocus}
              onBlur={inputHandlers.onBlur}
              placeholder={placeholder}
              aria-label="Search for dishes or restaurants"
              aria-expanded={open}
              aria-controls={listId}
              autoComplete="off"
              role="combobox"
              className="h-8 w-full bg-transparent pl-7 pr-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            className="h-8 shrink-0 rounded-button bg-primary px-3 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
          >
            Search
          </button>
        </div>
        {dropdown}
      </form>
    );
  }

  // Unified panel: type toggle + joined input/button + full-width suggestions
  return (
    <form onSubmit={handleSubmit} className={cn('relative z-[80] w-full', className)}>
      <div
        className={cn(
          'rounded-card transition-[box-shadow,border-color,ring] duration-300 ease-soft',
          onDark
            ? 'bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/5 focus-within:ring-primary/25'
            : 'border border-border bg-surface shadow-soft focus-within:border-primary/30 focus-within:shadow-glow',
        )}
      >
        <div className="flex gap-1 border-b border-border/80 bg-muted/40 p-1.5">
          {(['dish', 'restaurant'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => selectType(t)}
              className={cn(
                'flex-1 rounded-button px-3 py-2.5 text-sm font-semibold capitalize transition-all duration-200 ease-soft min-h-[44px]',
                type === t
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:bg-white/80 hover:text-foreground',
              )}
              aria-pressed={type === t}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-stretch gap-0 p-1.5">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => inputHandlers.onChange(e.target.value)}
              onFocus={inputHandlers.onFocus}
              onBlur={inputHandlers.onBlur}
              placeholder={placeholder}
              aria-label="Search for dishes or restaurants"
              aria-expanded={open}
              aria-controls={listId}
              autoComplete="off"
              role="combobox"
              className={cn(
                'w-full rounded-button bg-transparent pl-10 pr-3 text-foreground outline-none placeholder:text-muted-foreground',
                large ? 'h-12 text-base' : 'h-11 text-sm',
              )}
            />
          </div>
          <button
            type="submit"
            className={cn(
              'shrink-0 rounded-button bg-primary px-5 font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-glow active:scale-[0.98]',
              large ? 'h-12 text-sm' : 'h-11 text-sm',
            )}
          >
            Search
          </button>
        </div>
      </div>
      {dropdown}
    </form>
  );
}
