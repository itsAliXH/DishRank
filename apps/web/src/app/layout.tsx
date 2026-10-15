import type { Metadata, Viewport } from 'next';
import { Figtree, Syne } from 'next/font/google';
import './globals.css';
import {
  AuthProvider,
  BookmarksProvider,
  CityProvider,
  HomeBootstrapProvider,
  LocationProvider,
} from '@/providers';
import {
  TopNav,
  MobileHeader,
  BottomNav,
  NavigationProgress,
  PwaRegister,
  InstallPrompt,
} from '@/components/shell';

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DishRank — Find the Best Dishes Near You',
  description:
    'Rate and discover individual dishes, not just restaurants. Find the best Biryani, Burger, Pizza and more.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DishRank',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#D61F4A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${syne.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col bg-background font-sans" suppressHydrationWarning>
        <AuthProvider>
          <CityProvider>
            <HomeBootstrapProvider>
              <BookmarksProvider>
                <LocationProvider>
                  <NavigationProgress />
                  <TopNav />
                  <MobileHeader />
                  <main className="flex-1 mobile-page-pad md:pb-10">{children}</main>
                  <BottomNav />
                  <InstallPrompt />
                  <PwaRegister />
                </LocationProvider>
              </BookmarksProvider>
            </HomeBootstrapProvider>
          </CityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
