'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { City } from '@dishrank/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PanelLoading } from '@/components/ui/loading';

type AdminCity = City & {
  isActive: boolean;
  _count?: { restaurants: number };
};

const COMMON_PROVINCES = [
  'Sindh',
  'Punjab',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu & Kashmir',
];

export function AdminCitiesManager() {
  const [cities, setCities] = useState<AdminCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createProvince, setCreateProvince] = useState(COMMON_PROVINCES[0]);
  const [createCustomProvince, setCreateCustomProvince] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listAdminCities();
      setCities(list);
      setSelectedIds(new Set());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load cities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const provinces = useMemo(() => {
    const set = new Set(cities.map((c) => c.province));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [cities]);

  const filtered = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    return cities.filter((c) => {
      if (provinceFilter && c.province !== provinceFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  }, [cities, nameFilter, provinceFilter]);

  const filteredIds = useMemo(() => filtered.map((c) => c.id), [filtered]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.has(id));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
  };

  const applyBulk = async (isActive: boolean) => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      setMessage('Select at least one city');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const updated = await api.bulkUpdateAdminCities(ids, isActive);
      const byId = new Map(updated.map((c) => [c.id, c]));
      setCities((rows) => rows.map((c) => (byId.has(c.id) ? { ...c, ...byId.get(c.id)! } : c)));
      setSelectedIds(new Set());
      setMessage(
        isActive
          ? `Enabled ${updated.length} cit${updated.length === 1 ? 'y' : 'ies'} on the portal`
          : `Disabled ${updated.length} cit${updated.length === 1 ? 'y' : 'ies'}`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const createCity = async () => {
    const name = createName.trim();
    const province = createProvince.trim();
    if (!name || !province) return;
    setBusy(true);
    setMessage(null);
    try {
      const created = await api.createAdminCity({ name, province, isActive: false });
      setCities((rows) =>
        [...rows, created].sort((a, b) =>
          a.province === b.province
            ? a.name.localeCompare(b.name)
            : a.province.localeCompare(b.province),
        ),
      );
      setMessage(`Added ${created.name} (disabled until you enable it)`);
      setCreateOpen(false);
      setCreateName('');
      setCreateProvince(COMMON_PROVINCES[0]);
      setCreateCustomProvince(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not add city');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PanelLoading
        label="Loading cities…"
        hint="Fetching locations and provinces"
        rows={5}
        rowHeight="h-12"
      />
    );
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder="Search city name…"
          aria-label="Search cities"
          className="sm:flex-1"
        />
        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          aria-label="Filter by province"
          className="flex h-10 w-full sm:w-56 shrink-0 rounded-button border border-border bg-surface px-3 text-sm"
        >
          <option value="">All provinces</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <Button type="button" className="w-full sm:w-auto shrink-0" onClick={() => setCreateOpen(true)}>
          Add city
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-card border border-border bg-surface px-3 py-2.5">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            ref={(el) => {
              if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
            }}
            onChange={toggleSelectAllFiltered}
            className="h-4 w-4 rounded border-border"
            aria-label="Select all filtered cities"
          />
          <span>
            {allFilteredSelected ? 'Deselect all' : 'Select all'}
            <span className="text-muted-foreground">
              {' '}
              ({filtered.length} shown
              {selectedCount > 0 ? ` · ${selectedCount} selected` : ''})
            </span>
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || selectedCount === 0}
            onClick={() => applyBulk(true)}
          >
            Enable selected
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || selectedCount === 0}
            onClick={() => applyBulk(false)}
          >
            Disable selected
          </Button>
        </div>
      </div>

      {message && (
        <p className="text-sm text-muted-foreground rounded-button border border-border bg-surface px-3 py-2">
          {message}
        </p>
      )}

      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {filtered.map((city) => {
          const checked = selectedIds.has(city.id);
          return (
            <li key={city.id}>
              <label
                className={cn(
                  'flex items-start gap-3 p-3 cursor-pointer sm:items-center',
                  checked && 'bg-muted/40',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOne(city.id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-border sm:mt-0"
                  aria-label={`Select ${city.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">{city.name}</span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-button',
                        city.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-amber-100 text-amber-800',
                      )}
                    >
                      {city.isActive ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {city.province}
                    {city._count != null && (
                      <>
                        {' '}
                        · {city._count.restaurants} restaurant
                        {city._count.restaurants === 1 ? '' : 's'}
                      </>
                    )}
                  </p>
                </div>
              </label>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No cities match this filter.</li>
        )}
      </ul>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add city</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">City name</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Mirpur"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Province / territory</label>
              {!createCustomProvince ? (
                <select
                  value={createProvince}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setCreateCustomProvince(true);
                      setCreateProvince('');
                    } else {
                      setCreateProvince(e.target.value);
                    }
                  }}
                  className="flex h-10 w-full rounded-button border border-border bg-surface px-3 text-sm"
                >
                  {COMMON_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="__custom__">Other…</option>
                </select>
              ) : (
                <Input
                  value={createProvince}
                  onChange={(e) => setCreateProvince(e.target.value)}
                  placeholder="Province name"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              New cities are disabled by default. Enable them from the list after adding.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!createName.trim() || !createProvince.trim() || busy}
                onClick={createCity}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
