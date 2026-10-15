'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Restaurant } from '@dishrank/shared';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface RestaurantNameSuggestProps {
  value: string;
  onChange: (name: string) => void;
  /** Called when user picks an existing restaurant from suggestions. */
  onPickExisting?: (restaurant: Restaurant) => void;
  cityId?: string | null;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
}

export function RestaurantNameSuggest({
  value,
  onChange,
  onPickExisting,
  cityId,
  disabled,
  placeholder = 'e.g. Student Biryani',
  className,
  required,
  id,
}: RestaurantNameSuggestProps) {
  const listId = useId();
  const [options, setOptions] = useState<Restaurant[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await api.suggestRestaurants(
          value.trim() || undefined,
          cityId || undefined,
        );
        if (!cancelled) setOptions(list);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, cityId]);

  const pick = (r: Restaurant) => {
    onChange(r.name);
    onPickExisting?.(r);
    setOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
      />
      {open && (loading || options.length > 0) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-button border border-border bg-surface shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          {loading && options.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>
          )}
          {options.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => pick(r)}
              >
                <span className="font-medium">{r.name}</span>
                {(r.address || r.city) && (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground truncate">
                    {[r.address, r.city ? `${r.city.name}` : null].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
