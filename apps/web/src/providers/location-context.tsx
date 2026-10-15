'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

interface LocationContextType extends LocationState {
  requestLocation: () => Promise<boolean>;
  clearError: () => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

function mapGeoError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location permission denied. Allow location for this site in your browser settings, then try again.';
    case err.POSITION_UNAVAILABLE:
      return 'Location unavailable. Check that Location Services are on for your browser.';
    case err.TIMEOUT:
      return 'Location request timed out. Try again, or move somewhere with a clearer signal.';
    default:
      return err.message || 'Could not get your location.';
  }
}

function getCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
  });

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const requestLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation is not supported in this browser.' }));
      return false;
    }

    // Geolocation requires a secure context (https or localhost)
    if (!window.isSecureContext) {
      setState((s) => ({
        ...s,
        error:
          'Location needs a secure page. Open the app at http://localhost:3000 (not a LAN IP over http).',
      }));
      return false;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      let pos: GeolocationPosition;
      try {
        pos = await getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 60_000,
        });
      } catch {
        // Indoor / Mac Wi‑Fi often fails high-accuracy — retry softer
        pos = await getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 120_000,
        });
      }

      setState({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        error: null,
        loading: false,
      });
      return true;
    } catch (err) {
      const message =
        err instanceof GeolocationPositionError
          ? mapGeoError(err)
          : 'Could not get your location.';
      setState({
        lat: null,
        lng: null,
        error: message,
        loading: false,
      });
      return false;
    }
  }, []);

  return (
    <LocationContext.Provider value={{ ...state, requestLocation, clearError }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
