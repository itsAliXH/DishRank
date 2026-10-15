'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, type MouseEvent } from 'react';
import { SearchBar } from '@/components/shell/search-bar';
import { WorkspaceSwitch } from '@/components/shell/workspace-switch';
import { AccountMenu } from '@/components/shell/account-menu';
import { AuthDialog } from '@/features/auth/auth-dialog';
import { useAuth } from '@/providers/auth-context';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CitySelect } from '@/components/shell/city-select';
import { dashboardPathForUser, isWorkspacePath } from '@/lib/auth-routes';
import { getStoredSearchType } from '@/lib/search-prefs';

function NearMeLink({ className, active }: { className?: string; active?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q =
    pathname === '/search' || pathname === '/near-me'
      ? (searchParams.get('q') || '').trim()
      : '';
  const typeFromUrl = searchParams.get('type');

  const resolveType = () => {
    if (pathname === '/search' || pathname === '/near-me') {
      return typeFromUrl === 'restaurant' ? 'restaurant' : 'dish';
    }
    return getStoredSearchType();
  };

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (active) return;
    e.preventDefault();
    const type = resolveType();
    const href = q
      ? `/near-me?type=${type}&q=${encodeURIComponent(q)}`
      : `/near-me?type=${type}`;
    router.push(href);
  };

  return (
    <Link
      href={active ? '/' : `/near-me?type=${resolveType()}`}
      onClick={handleClick}
      className={className}
      aria-current={active ? 'page' : undefined}
      aria-label={
        active
          ? 'Exit Near Me and browse all'
          : 'Show places near you'
      }
      title={active ? 'Back to browse' : 'Near Me'}
    >
      Near Me
    </Link>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const isHome = pathname === '/';
  const isWorkspaceRoute = isWorkspacePath(pathname);
  const dashboard = dashboardPathForUser(user);
  const nearMeActive = pathname === '/near-me';

  return (
    <header className="glass-header hidden md:block sticky top-0 z-40 w-full">
      <div className="mx-auto grid h-14 w-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:gap-6 lg:px-10">
        <Link href={isWorkspaceRoute && dashboard ? dashboard : '/'} className="group flex items-center gap-2.5 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-primary shadow-sm shadow-primary/25 flex items-center justify-center transition-all duration-300 ease-soft group-hover:scale-[1.05] group-hover:shadow-glow">
            <UtensilsCrossed className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="font-display font-bold text-foreground tracking-tight text-[1.1rem] transition-colors group-hover:text-primary">
            DishRank
          </span>
        </Link>

        <div className="flex justify-center min-w-0 px-2">
          {!isHome && !isWorkspaceRoute && (
            <div className="w-full max-w-lg">
              <Suspense fallback={null}>
                <SearchBar variant="compact" />
              </Suspense>
            </div>
          )}
          {pathname.startsWith('/admin') && (
            <p className="text-sm font-medium text-muted-foreground truncate">Admin Panel</p>
          )}
          {pathname.startsWith('/owner') && (
            <p className="text-sm font-medium text-muted-foreground truncate">Owner Panel</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-self-end min-w-0">
          {!isWorkspaceRoute && !nearMeActive && (
            <div className="w-[8.5rem] md:w-36 lg:w-44 shrink-0">
              <CitySelect />
            </div>
          )}
          <nav className="flex items-center gap-1.5 lg:gap-2" aria-label="Desktop navigation">
            {!isWorkspaceRoute && (
              <Suspense fallback={null}>
                <NearMeLink
                  active={nearMeActive}
                  className={cn(
                    'px-2 lg:px-3 py-1.5 rounded-button text-sm font-medium transition-all duration-200 ease-soft whitespace-nowrap',
                    nearMeActive
                      ? 'text-primary bg-primary/10 shadow-sm shadow-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                />
              </Suspense>
            )}
            <WorkspaceSwitch />
          </nav>

          {user ? (
            <AccountMenu />
          ) : (
            <Button size="sm" className="shrink-0" onClick={() => setAuthOpen(true)}>
              Sign In
            </Button>
          )}
        </div>
      </div>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </header>
  );
}
