'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { UtensilsCrossed } from 'lucide-react';
import { apiUrl } from '@/lib/api';

/** Plain img for arbitrary pasted URLs (avoids next/image host allowlist). */
export function MediaImage({
  src,
  alt,
  className,
  fill,
  placeholderClassName,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fill?: boolean;
  placeholderClassName?: string;
}) {
  const [error, setError] = useState(false);
  const resolved = src ? apiUrl(src) : null;
  const show = !!resolved && !error;

  if (!show) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted',
          fill && 'absolute inset-0 h-full w-full',
          placeholderClassName,
        )}
        aria-hidden="true"
      >
        {!placeholderClassName && (
          <UtensilsCrossed className="h-6 w-6 text-muted-foreground/40" />
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin/owner may paste any https host
    <img
      src={resolved}
      alt={alt}
      className={cn(fill && 'absolute inset-0 h-full w-full', 'object-cover', className)}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}
