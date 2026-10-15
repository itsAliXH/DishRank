'use client';

import { useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const DEFAULT_ADMIN_COUNTRY = 'Pakistan';

/**
 * Country / province / city filters shared across admin tabs via URL search params.
 * Changing tab preserves `country`, `province`, and `cityId` so Overview → Catalog/Reviews
 * keeps the same scope.
 */
export function useAdminLocationFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const countryFilter = searchParams.get('country') || DEFAULT_ADMIN_COUNTRY;
  const provinceFilter = searchParams.get('province') || '';
  const cityFilter = searchParams.get('cityId') || '';

  const patchFilters = useCallback(
    (patch: { country?: string; province?: string; cityId?: string }) => {
      const sp = new URLSearchParams(searchParams.toString());

      const apply = (key: string, value: string | undefined, defaultValue?: string) => {
        if (value === undefined) return;
        if (!value || (defaultValue !== undefined && value === defaultValue)) {
          sp.delete(key);
        } else {
          sp.set(key, value);
        }
      };

      apply('country', patch.country, DEFAULT_ADMIN_COUNTRY);
      apply('province', patch.province);
      apply('cityId', patch.cityId);

      router.replace(`/admin?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setCountryFilter = useCallback(
    (value: string) => patchFilters({ country: value }),
    [patchFilters],
  );

  const setProvinceFilter = useCallback(
    (value: string) => patchFilters({ province: value, cityId: '' }),
    [patchFilters],
  );

  const setCityFilter = useCallback(
    (value: string) => patchFilters({ cityId: value }),
    [patchFilters],
  );

  return {
    countryFilter,
    provinceFilter,
    cityFilter,
    setCountryFilter,
    setProvinceFilter,
    setCityFilter,
  };
}

/** Drop cityId from the URL only after cities have loaded and the id is truly invalid. */
export function usePruneInvalidAdminCity(
  cities: { id: string }[],
  citiesForFilter: { id: string }[],
  cityFilter: string,
  setCityFilter: (value: string) => void,
  onPruned?: () => void,
) {
  useEffect(() => {
    if (!cityFilter || cities.length === 0) return;
    if (!citiesForFilter.some((c) => c.id === cityFilter)) {
      setCityFilter('');
      onPruned?.();
    }
  }, [cities, citiesForFilter, cityFilter, setCityFilter, onPruned]);
}
