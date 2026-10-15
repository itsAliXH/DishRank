'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category } from '@dishrank/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PanelLoading } from '@/components/ui/loading';

type AdminCategory = Category & {
  isActive?: boolean;
  _count?: { dishes: number };
};

export function AdminCategoriesManager() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listAdminCategories();
      setCategories(list);
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setMessage(null);
    try {
      await api.createAdminCategory({ name: newName.trim() });
      setNewName('');
      await load();
      setMessage('Category added.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const saveRename = async (id: string) => {
    if (!editName.trim()) return;
    setBusyId(id);
    setMessage(null);
    try {
      await api.updateAdminCategory(id, { name: editName.trim() });
      setEditId(null);
      await load();
      setMessage('Category renamed (dish labels updated).');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Rename failed');
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (c: AdminCategory) => {
    setBusyId(c.id);
    setMessage(null);
    try {
      await api.updateAdminCategory(c.id, { isActive: !c.isActive });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          Canonical list for dishes. Users pick from this list; rename here to fix typos for
          everyone.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">New category</label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Steak"
            required
          />
        </div>
        <Button type="submit" disabled={creating}>
          {creating ? 'Adding…' : 'Add'}
        </Button>
      </form>

      {message && (
        <p className="block w-full text-sm text-primary" role="status">
          {message}
        </p>
      )}

      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter categories…"
      />


      {loading ? (
        <PanelLoading
          label="Loading categories…"
          hint="Fetching dish types"
          rows={5}
          rowHeight="h-12"
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories match.</p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                {editId === c.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void saveRename(c.id);
                      }
                      if (e.key === 'Escape') setEditId(null);
                    }}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                        c.isActive === false
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-success/10 text-success',
                      )}
                    >
                      {c.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c._count?.dishes ?? 0} dishes
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {editId === c.id ? (
                  <>
                    <Button
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => void saveRename(c.id)}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(c.id);
                        setEditName(c.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === c.id}
                      onClick={() => void toggleActive(c)}
                    >
                      {c.isActive === false ? 'Activate' : 'Deactivate'}
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
