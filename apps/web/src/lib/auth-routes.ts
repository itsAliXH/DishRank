import type { User } from '@dishrank/shared';

/** Workspace home for staff roles; null for regular diners. */
export function dashboardPathForUser(user: Pick<User, 'role'> | null | undefined): string | null {
  if (!user) return null;
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'RESTAURANT_OWNER') return '/owner';
  return null;
}

export function isWorkspacePath(pathname: string) {
  return pathname.startsWith('/admin') || pathname.startsWith('/owner');
}
