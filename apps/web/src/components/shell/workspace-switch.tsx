'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Compass } from 'lucide-react';
import { useAuth } from '@/providers/auth-context';
import { dashboardPathForUser, isWorkspacePath } from '@/lib/auth-routes';
import { cn } from '@/lib/utils';

/** Clear CTA between staff dashboard and the public browse app. */
export function WorkspaceSwitch({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const dashboard = dashboardPathForUser(user);
  if (!dashboard) return null;

  const onDashboard = isWorkspacePath(pathname);
  const href = onDashboard ? '/' : dashboard;
  const isAdmin = user?.role === 'ADMIN';
  const label = onDashboard ? 'Browse app' : isAdmin ? 'Admin panel' : 'Owner panel';
  const Icon = onDashboard ? Compass : isAdmin ? LayoutDashboard : Store;

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-button text-sm font-semibold transition-all duration-200 ease-soft whitespace-nowrap',
        compact ? 'px-2.5 py-1.5' : 'px-3 py-1.5',
        onDashboard
          ? 'border border-border bg-surface text-foreground shadow-soft hover:bg-muted'
          : 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:brightness-105 hover:shadow-glow',
        className,
      )}
      aria-label={onDashboard ? 'Switch to browse app' : `Open ${label}`}
      title={label}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={cn(compact && 'hidden min-[380px]:inline')}>{label}</span>
    </Link>
  );
}
