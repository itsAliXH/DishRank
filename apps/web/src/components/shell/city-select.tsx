'use client';

import { useCity } from '@/providers/city-context';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CitySelect({
  className,
  allowAll = true,
  value,
  onChange,
  id,
}: {
  className?: string;
  allowAll?: boolean;
  /** Controlled value — if omitted, uses global city preference */
  value?: string | null;
  onChange?: (cityId: string | null) => void;
  id?: string;
}) {
  const { cities, cityId, setCityId, loading } = useCity();
  const current = value !== undefined ? value : cityId;
  const handle = (next: string) => {
    const normalized = next || null;
    if (onChange) onChange(normalized);
    else setCityId(normalized);
  };

  return (
    <div className={cn('relative', className)}>
      <MapPin
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <select
        id={id}
        value={current || ''}
        disabled={loading}
        onChange={(e) => handle(e.target.value)}
        className={cn(
          'flex h-11 w-full appearance-none rounded-button border border-border bg-surface pl-8 pr-7 text-sm truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
        )}
        aria-label="City"
      >
        {allowAll && <option value="">All cities</option>}
        {!allowAll && <option value="">Select city</option>}
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.province})
          </option>
        ))}
      </select>
    </div>
  );
}
