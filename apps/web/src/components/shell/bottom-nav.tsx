'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, type MouseEvent } from 'react';
import { Search, MapPin, Star, User, LayoutDashboard, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-context';
import { getStoredSearchType } from '@/lib/search-prefs';

function BottomNavInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'dish';
  const isOwner = user?.role === 'RESTAURANT_OWNER';
  const isAdmin = user?.role === 'ADMIN';
  const profileHref = isOwner ? '/owner' : isAdmin ? '/admin' : '/profile';
  const profileLabel = isAdmin ? 'Admin' : isOwner ? 'Owner' : 'Profile';
  const ProfileIcon = isAdmin ? LayoutDashboard : isOwner ? Store : User;

  const goNearMe = (e: MouseEvent) => {
    e.preventDefault();
    const searchType =
      pathname === '/search' || pathname === '/near-me'
        ? type === 'restaurant'
          ? 'restaurant'
          : 'dish'
        : getStoredSearchType();
    const query =
      pathname === '/search' || pathname === '/near-me' ? q.trim() : '';
    const href = query
      ? `/near-me?type=${searchType}&q=${encodeURIComponent(query)}`
      : `/near-me?type=${searchType}`;
    router.push(href);
  };

  const tabs: {
    href: string;
    label: string;
    icon: typeof Search;
    match: (p: string) => boolean;
    onClick?: (e: MouseEvent) => void;
  }[] = [
    {
      href: '/',
      label: 'Search',
      icon: Search,
      match: (p: string) => p === '/' || p.startsWith('/search'),
    },
    {
      href: '/near-me',
      label: 'Near Me',
      icon: MapPin,
      match: (p: string) => p === '/near-me',
      onClick: goNearMe,
    },
    { href: '/rate', label: 'Rate', icon: Star, match: (p: string) => p === '/rate' },
    {
      href: profileHref,
      label: profileLabel,
      icon: ProfileIcon,
      match: (p: string) =>
        p === '/profile' ||
        p === '/saved' ||
        (isOwner && p.startsWith('/owner')) ||
        (isAdmin && p.startsWith('/admin')),
    },
  ];

  return (
    <nav
      className="glass-nav fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe shadow-[0_-8px_24px_-20px_rgba(22,20,18,0.25)]"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-stretch h-[4.25rem]">
        {tabs.map(({ href, label, icon: Icon, match, onClick }) => {
          const active = match(pathname);
          return (
            <Link
              key={label}
              href={href}
              onClick={onClick}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wide transition-colors duration-200 touch-target',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={cn(
                  'absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary transition-all duration-300 ease-soft',
                  active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50',
                )}
              />
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-soft',
                  active ? 'bg-primary/10 scale-105' : 'bg-transparent scale-100',
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform duration-300 ease-soft',
                    active && 'scale-110',
                  )}
                  aria-hidden="true"
                />
              </span>
              <span
                className={cn(
                  'transition-opacity duration-200',
                  active ? 'opacity-100' : 'opacity-80',
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  );
}
