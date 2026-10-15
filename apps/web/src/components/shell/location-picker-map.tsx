'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Crosshair, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type LatLng = { lat: number; lng: number };

type SearchHit = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
};

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  getZoom: () => number;
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  remove: () => void;
  removeLayer: (layer: LeafletMarker) => void;
  invalidateSize: () => void;
};

type LeafletMarker = {
  setLatLng: (latlng: [number, number]) => void;
  addTo: (map: LeafletMap) => LeafletMarker;
};

type LeafletIcon = object;

type LeafletNS = {
  map: (
    el: HTMLElement,
    opts?: { scrollWheelZoom?: boolean; attributionControl?: boolean },
  ) => LeafletMap;
  tileLayer: (
    url: string,
    opts?: { attribution?: string },
  ) => { addTo: (map: LeafletMap) => void };
  marker: (
    latlng: [number, number],
    opts?: { icon?: LeafletIcon },
  ) => LeafletMarker;
  icon: (opts: Record<string, unknown>) => LeafletIcon;
};

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function loadLeafletAssets(): Promise<LeafletNS> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Leaflet needs a browser'));
  }

  const w = window as Window & { L?: LeafletNS };
  if (w.L) return Promise.resolve(w.L);

  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }

  const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      if (w.L) resolve(w.L);
      else {
        existing.addEventListener('load', () =>
          w.L ? resolve(w.L) : reject(new Error('Leaflet failed to load')),
        );
        existing.addEventListener('error', () => reject(new Error('Leaflet failed to load')));
      }
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () =>
      w.L ? resolve(w.L) : reject(new Error('Leaflet failed to load'));
    script.onerror = () => reject(new Error('Leaflet failed to load'));
    document.head.appendChild(script);
  });
}

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  defaultCenter: LatLng;
  className?: string;
  searchHint?: string;
  /** Biases place search toward this city (e.g. "Lahore"). */
  cityName?: string | null;
  /** Tighter map + less helper copy for dialogs / side panels. */
  compact?: boolean;
  /** Preview-only: hide search/geo controls and ignore map clicks. */
  readOnly?: boolean;
}

export function LocationPickerMap({
  value,
  onChange,
  defaultCenter,
  className,
  searchHint = 'Search area or restaurant…',
  cityName,
  compact = false,
  readOnly = false,
}: LocationPickerProps) {
  const mapId = useId().replace(/:/g, '');
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const iconRef = useRef<LeafletIcon | null>(null);
  const leafletRef = useRef<LeafletNS | null>(null);
  const onChangeRef = useRef(onChange);
  const defaultCenterRef = useRef(defaultCenter);
  const readOnlyRef = useRef(readOnly);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  onChangeRef.current = onChange;
  defaultCenterRef.current = defaultCenter;
  readOnlyRef.current = readOnly;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const L = await loadLeafletAssets();
        if (cancelled) return;

        const el = document.getElementById(`map-${mapId}`);
        if (!el || mapRef.current) return;

        const center = defaultCenterRef.current;
        const map = L.map(el, {
          scrollWheelZoom: false,
          attributionControl: true,
        }).setView([center.lat, center.lng], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const icon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        map.on('click', (e) => {
          if (readOnlyRef.current) return;
          onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        leafletRef.current = L;
        iconRef.current = icon;
        mapRef.current = map;
        setReady(true);
        setMapError(null);
        setTimeout(() => map.invalidateSize(), 80);
      } catch {
        if (!cancelled) setMapError('Could not load the map. Check your network and try again.');
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        iconRef.current = null;
        leafletRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount
  }, [mapId]);

  useEffect(() => {
    const map = mapRef.current;
    const icon = iconRef.current;
    const L = leafletRef.current;
    if (!map || !ready || !icon || !L) return;

    if (value) {
      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng]);
      } else {
        markerRef.current = L.marker([value.lat, value.lng], { icon }).addTo(map);
      }
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16));
    } else {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      map.setView([defaultCenter.lat, defaultCenter.lng], 12);
    }
    setTimeout(() => map.invalidateSize(), 50);
  }, [value, defaultCenter.lat, defaultCenter.lng, ready]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({ q });
        if (cityName) params.set('city', cityName);
        params.set('lat', String(defaultCenter.lat));
        params.set('lng', String(defaultCenter.lng));
        const res = await fetch(`/api/geocode?${params.toString()}`);
        if (!res.ok) throw new Error('Search failed');
        const data = (await res.json()) as SearchHit[] | { error?: string };
        if (!Array.isArray(data)) throw new Error('Search failed');
        if (!cancelled) setHits(data);
      } catch {
        if (!cancelled) {
          setHits([]);
          setSearchError('Search unavailable. Tap the map to drop a pin instead.');
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, cityName, defaultCenter.lat, defaultCenter.lng]);

  const useMyLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Allow location, or drop a pin on the map.'
            : 'Could not read your location. Drop a pin on the map instead.',
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  return (
    <div className={cn('space-y-2', className)}>
      {!readOnly && (
        <div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setOpen(false), 180);
              }}
              placeholder={searchHint}
              className="pl-9"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={open && query.trim().length >= 2}
            />
          </div>

          {/* In-flow (not absolute) so dialogs with overflow don't clip suggestions */}
          {open && query.trim().length >= 2 && (
            <ul
              role="listbox"
              className={cn(
                'mt-1.5 overflow-y-auto rounded-button border border-border bg-surface shadow-soft',
                compact ? 'max-h-32' : 'max-h-44',
              )}
              onMouseDown={(e) => e.preventDefault()}
            >
              {searching && hits.length === 0 && (
                <li className="px-3 py-2.5 text-xs text-muted-foreground">Searching places…</li>
              )}
              {!searching && searchError && (
                <li className="px-3 py-2.5 text-xs text-red-600">{searchError}</li>
              )}
              {!searching && !searchError && hits.length === 0 && (
                <li className="px-3 py-2.5 text-xs text-muted-foreground">
                  No matching places found. Try a street or landmark, or tap the map below.
                </li>
              )}
              {hits.map((h) => (
                <li key={String(h.place_id)} role="option">
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                    onClick={() => {
                      onChange({ lat: Number(h.lat), lng: Number(h.lon) });
                      setQuery(h.display_name.split(',').slice(0, 3).join(','));
                      setOpen(false);
                      setHits([]);
                    }}
                  >
                    <span className="line-clamp-2">{h.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="relative isolate z-0 overflow-hidden rounded-card border border-border">
        <div
          id={`map-${mapId}`}
          className={cn('w-full bg-muted/40', compact ? 'h-52 sm:h-60' : 'h-56 sm:h-64')}
        />
      </div>

      {mapError && (
        <p className="text-xs text-red-600" role="alert">
          {mapError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={useMyLocation}
            disabled={locating}
          >
            <Crosshair className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {locating ? 'Locating…' : 'Use my location'}
          </Button>
        )}
        {value ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Pin set · {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
          </p>
        ) : (
          <p className="text-xs text-amber-700">
            {readOnly ? 'No map pin was provided.' : 'Search, tap the map, or use GPS'}
          </p>
        )}
      </div>
      {!readOnly && geoError && (
        <p className="text-xs text-red-600" role="alert">
          {geoError}
        </p>
      )}
      {!readOnly && !compact && (
        <p className="text-[11px] text-muted-foreground">
          Exact coordinates power Near Me and receipt verification distance checks.
        </p>
      )}
    </div>
  );
}
