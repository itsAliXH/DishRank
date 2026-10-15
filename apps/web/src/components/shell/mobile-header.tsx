'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { UtensilsCrossed, User } from 'lucide-react';
import { AuthDialog } from '@/features/auth/auth-dialog';
import { WorkspaceSwitch } from '@/components/shell/workspace-switch';
import { AccountMenu } from '@/components/shell/account-menu';
import { useAuth } from '@/providers/auth-context';
import { CitySelect } from '@/components/shell/city-select';
import { dashboardPathForUser, isWorkspacePath } from '@/lib/auth-routes';

export function MobileHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const dashboard = dashboardPathForUser(user);
  const onWorkspace = isWorkspacePath(pathname);

  return (
    <header className="glass-header md:hidden sticky top-0 z-40 px-3 sm:px-4 py-2.5 flex items-center gap-2">
      <Link
        href={onWorkspace && dashboard ? dashboard : '/'}
        className="group flex items-center gap-2 touch-target shrink-0"
        aria-label="DishRank home"
      >
        <div className="h-9 w-9 rounded-xl bg-primary shadow-sm shadow-primary/20 flex items-center justify-center transition-transform duration-300 ease-soft group-active:scale-95">
          <UtensilsCrossed className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
        </div>
        <span className="font-display font-bold text-foreground tracking-tight hidden min-[400px]:inline">
          DishRank
        </span>
      </Link>

      {!onWorkspace && pathname !== '/near-me' && (
        <div className="flex-1 min-w-0 max-w-[9.5rem] sm:max-w-[12rem] ml-auto">
          <CitySelect />
        </div>
      )}
      {(onWorkspace || pathname === '/near-me') && <div className="flex-1" />}

      <div className="flex items-center gap-1.5 shrink-0">
        <WorkspaceSwitch compact />
        {user ? (
          <AccountMenu compact />
        ) : (
          <button
            onClick={() => setAuthOpen(true)}
            className="touch-target flex items-center justify-center rounded-full bg-muted"
            aria-label="Sign in"
          >
            <User className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </header>
  );
}
