'use client';

import dynamic from 'next/dynamic';
import type { LatLng } from '@/components/shell/location-picker-map';

const LocationPickerMap = dynamic(
  () =>
    import('@/components/shell/location-picker-map').then((m) => m.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-52 items-center justify-center rounded-card border border-border bg-muted/40 text-sm text-muted-foreground sm:h-60">
        Loading map…
      </div>
    ),
  },
);

export type { LatLng };

export function LocationPicker(props: {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  defaultCenter: LatLng;
  className?: string;
  searchHint?: string;
  cityName?: string | null;
  compact?: boolean;
  readOnly?: boolean;
}) {
  return <LocationPickerMap {...props} />;
}
