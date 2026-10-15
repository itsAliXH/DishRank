'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Compass,
  LayoutDashboard,
  LogOut,
  Store,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-context';
import { dashboardPathForUser, isWorkspacePath } from '@/lib/auth-routes';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

function roleLabel(role: string | undefined) {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'RESTAURANT_OWNER') return 'Owner';
  return 'Member';
}

function isMemberDashboardPath(pathname: string) {
  return pathname === '/profile' || pathname.startsWith('/profile/') || pathname === '/saved';
}

export function AccountMenu({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  if (!user) return null;

  const staffDashboard = dashboardPathForUser(user);
  const homeHref = staffDashboard || '/profile';
  const onHome =
    staffDashboard != null ? isWorkspacePath(pathname) : isMemberDashboardPath(pathname);
  const accountHref = staffDashboard
    ? `${staffDashboard}?tab=account`
    : '/profile';

  const homeLabel =
    user.role === 'ADMIN'
      ? 'Admin panel'
      : user.role === 'RESTAURANT_OWNER'
        ? 'Owner panel'
        : 'Dashboard';
  const HomeIcon =
    user.role === 'ADMIN'
      ? LayoutDashboard
      : user.role === 'RESTAURANT_OWNER'
        ? Store
        : LayoutDashboard;

  const handleSignOut = () => {
    logout();
    router.replace('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex items-center gap-2 rounded-button outline-none transition-colors',
            'focus-visible:ring-2 focus-visible:ring-primary/40',
            compact ? 'p-0.5' : 'pl-1 pr-1.5 py-0.5 hover:bg-muted/70',
            className,
          )}
          aria-label="Account menu"
        >
          <Avatar
            className={cn(
              'ring-2 ring-primary/20 transition-shadow group-hover:ring-primary/40',
              compact ? 'h-9 w-9' : 'h-8 w-8',
            )}
          >
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="hidden max-w-[7rem] truncate text-left text-xs lg:block">
              <span className="block truncate font-medium text-foreground">{user.name}</span>
              <span className="block truncate text-muted-foreground">{roleLabel(user.role)}</span>
            </span>
          )}
          {!compact && (
            <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline">
              {roleLabel(user.role)}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5 normal-case">
          <span className="block truncate text-sm font-semibold text-foreground">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
          <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {roleLabel(user.role)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!onHome ? (
          <DropdownMenuItem asChild className="font-medium text-primary focus:text-primary">
            <Link href={homeHref}>
              <HomeIcon className="h-4 w-4" aria-hidden="true" />
              {homeLabel}
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Browse app
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link href={accountHref}>
            <UserIcon className="h-4 w-4" aria-hidden="true" />
            Account settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onSelect={handleSignOut}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
