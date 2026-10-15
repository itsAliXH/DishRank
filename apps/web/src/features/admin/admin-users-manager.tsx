'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Restaurant, User, UserRole, UserStatus } from '@dishrank/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-context';
import { cn } from '@/lib/utils';
import { PanelLoading } from '@/components/ui/loading';

type AdminUser = User & {
  _count?: { reviews: number };
  ownedRestaurants?: Pick<Restaurant, 'id' | 'name'>[];
};

const ROLE_OPTIONS: UserRole[] = [
  'USER' as UserRole,
  'RESTAURANT_OWNER' as UserRole,
  'ADMIN' as UserRole,
];

function statusBadge(status?: string) {
  if (status === 'BANNED') return 'bg-red-100 text-red-700';
  if (status === 'DEACTIVATED') return 'bg-amber-100 text-amber-800';
  return 'bg-success/10 text-success';
}

function statusLabel(status?: string) {
  if (status === 'BANNED') return 'Banned';
  if (status === 'DEACTIVATED') return 'Deactivated';
  return 'Active';
}

export function AdminUsersManager() {
  const { user: actor } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('USER' as UserRole);
  const [editRestaurantIds, setEditRestaurantIds] = useState<string[]>([]);

  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [statusUser, setStatusUser] = useState<AdminUser | null>(null);
  const [statusAction, setStatusAction] = useState<'ban' | 'unban' | 'deactivate' | 'activate'>(
    'ban',
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<UserRole>('RESTAURANT_OWNER' as UserRole);
  const [createRestaurantIds, setCreateRestaurantIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, rests] = await Promise.all([
        api.listAdminUsers(),
        api.listAdminRestaurants(),
      ]);
      setUsers(list);
      setRestaurants(rests);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRestaurant = (
    id: string,
    selected: string[],
    setSelected: (ids: string[]) => void,
  ) => {
    setSelected(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');
    setEditRole(u.role);
    setEditRestaurantIds(u.ownedRestaurants?.map((r) => r.id) || []);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setBusyId(editUser.id);
    setMessage(null);
    try {
      const updated = await api.updateAdminUser(editUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || undefined,
        role: editRole,
        restaurantIds:
          editRole === 'RESTAURANT_OWNER' ? editRestaurantIds : [],
      });
      setUsers((rows) =>
        rows.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
      );
      setMessage(`Updated ${updated.email}`);
      setEditUser(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const savePassword = async () => {
    if (!passwordUser || newPassword.length < 6) return;
    setBusyId(passwordUser.id);
    setMessage(null);
    try {
      await api.setAdminUserPassword(passwordUser.id, newPassword);
      setMessage(`Password updated for ${passwordUser.email}`);
      setPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Password update failed');
    } finally {
      setBusyId(null);
    }
  };

  const confirmStatus = async () => {
    if (!statusUser) return;
    const next: UserStatus =
      statusAction === 'ban'
        ? 'BANNED'
        : statusAction === 'deactivate'
          ? 'DEACTIVATED'
          : 'ACTIVE';
    setBusyId(statusUser.id);
    setMessage(null);
    try {
      const updated = await api.setAdminUserStatus(statusUser.id, next);
      setUsers((rows) => rows.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      setMessage(`${statusLabel(next)} ${updated.email}`);
      setStatusUser(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusyId(null);
    }
  };

  const createAccount = async () => {
    if (createPassword.length < 6) return;
    setBusyId('create');
    setMessage(null);
    try {
      const created = await api.createAdminUser({
        name: createName.trim(),
        email: createEmail.trim(),
        phone: createPhone.trim() || undefined,
        password: createPassword,
        role: createRole,
        restaurantIds:
          createRole === 'RESTAURANT_OWNER' ? createRestaurantIds : undefined,
      });
      setUsers((rows) => [
        { ...created, _count: { reviews: 0 }, ownedRestaurants: created.ownedRestaurants },
        ...rows,
      ]);
      setMessage(`Created ${created.email}`);
      setCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePhone('');
      setCreatePassword('');
      setCreateRole('RESTAURANT_OWNER' as UserRole);
      setCreateRestaurantIds([]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusyId(null);
    }
  };

  const restaurantPicker = (
    selected: string[],
    setSelected: (ids: string[]) => void,
  ) => (
    <div className="max-h-40 overflow-y-auto rounded-button border border-border p-2 space-y-1">
      {restaurants.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1 py-2">No restaurants yet.</p>
      ) : (
        restaurants.map((r) => (
          <label
            key={r.id}
            className="flex items-center gap-2 px-1 py-1.5 text-sm rounded hover:bg-muted cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(r.id)}
              onChange={() => toggleRestaurant(r.id, selected, setSelected)}
            />
            <span className="truncate">{r.name}</span>
          </label>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <PanelLoading
        label="Loading accounts…"
        hint="Fetching users and owners"
        rows={5}
        rowHeight="h-14"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Create owner logins, assign one or more restaurants, update phone/email, deactivate or ban.
          Banned email/phone cannot be used to sign up again.
        </p>
        <Button size="sm" className="shrink-0" onClick={() => setCreateOpen(true)}>
          Create account
        </Button>
      </div>

      {message && (
        <p className="text-sm text-primary" role="status">
          {message}
        </p>
      )}

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-3 py-2.5">User</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = actor?.id === u.id;
                return (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      {u.phone && (
                        <p className="text-xs text-muted-foreground">{u.phone}</p>
                      )}
                      {u.ownedRestaurants && u.ownedRestaurants.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Owns: {u.ownedRestaurants.map((r) => r.name).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-medium">{u.role}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full',
                          statusBadge(u.status),
                        )}
                      >
                        {statusLabel(u.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === u.id}
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === u.id}
                          onClick={() => {
                            setPasswordUser(u);
                            setNewPassword('');
                          }}
                        >
                          Password
                        </Button>
                        {u.status === 'ACTIVE' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSelf || busyId === u.id}
                              className="border-amber-200 text-amber-800 hover:bg-amber-50"
                              onClick={() => {
                                setStatusUser(u);
                                setStatusAction('deactivate');
                              }}
                            >
                              Deactivate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSelf || busyId === u.id}
                              className="border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setStatusUser(u);
                                setStatusAction('ban');
                              }}
                            >
                              Ban
                            </Button>
                          </>
                        ) : u.status === 'DEACTIVATED' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSelf || busyId === u.id}
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => {
                              setStatusUser(u);
                              setStatusAction('activate');
                            }}
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSelf || busyId === u.id}
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => {
                              setStatusUser(u);
                              setStatusAction('unban');
                            }}
                          >
                            Unban
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+92 300 1234567"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                disabled={actor?.id === editUser?.id}
                className="flex h-11 w-full rounded-button border border-border bg-surface px-3 text-sm"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            {editRole === 'RESTAURANT_OWNER' && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Owned restaurants (one or more)
                </label>
                {restaurantPicker(editRestaurantIds, setEditRestaurantIds)}
                <p className="text-xs text-muted-foreground mt-1">
                  Listings stay public even with no owner selected.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={!!busyId}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordUser}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordUser(null);
            setNewPassword('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Set a new password for <strong>{passwordUser?.email}</strong>.
            </p>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              minLength={6}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPasswordUser(null)}>
                Cancel
              </Button>
              <Button
                onClick={savePassword}
                disabled={!!busyId || newPassword.length < 6}
              >
                Update password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusUser} onOpenChange={(open) => !open && setStatusUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusAction === 'ban'
                ? 'Ban account?'
                : statusAction === 'unban'
                  ? 'Unban account?'
                  : statusAction === 'deactivate'
                    ? 'Deactivate account?'
                    : 'Activate account?'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {statusAction === 'ban' && (
                <>
                  Ban <strong>{statusUser?.email}</strong>? They cannot sign in, and this email/phone
                  cannot be used to register again until unbanned.
                </>
              )}
              {statusAction === 'unban' && (
                <>
                  Unban <strong>{statusUser?.email}</strong> so they can sign in again.
                </>
              )}
              {statusAction === 'deactivate' && (
                <>
                  Deactivate <strong>{statusUser?.email}</strong>? They cannot sign in until you
                  activate them again. Email/phone stay reserved on this account.
                </>
              )}
              {statusAction === 'activate' && (
                <>
                  Reactivate <strong>{statusUser?.email}</strong> so they can sign in again.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusUser(null)}>
                Cancel
              </Button>
              <Button
                variant={
                  statusAction === 'ban' || statusAction === 'deactivate'
                    ? 'destructive'
                    : 'default'
                }
                onClick={confirmStatus}
                disabled={!!busyId}
              >
                {statusAction === 'ban'
                  ? 'Ban'
                  : statusAction === 'unban'
                    ? 'Unban'
                    : statusAction === 'deactivate'
                      ? 'Deactivate'
                      : 'Activate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input
                type="tel"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="+92 300 1234567"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <Input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Role</label>
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value as UserRole)}
                className="flex h-11 w-full rounded-button border border-border bg-surface px-3 text-sm"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            {createRole === 'RESTAURANT_OWNER' && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Owned restaurants (optional)
                </label>
                {restaurantPicker(createRestaurantIds, setCreateRestaurantIds)}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={createAccount}
                disabled={
                  busyId === 'create' ||
                  !createName.trim() ||
                  !createEmail.trim() ||
                  createPassword.length < 6
                }
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
