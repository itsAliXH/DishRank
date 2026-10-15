'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-context';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BackButton } from '@/components/shell/back-button';
import {
  ProfileAccountPanel,
  ProfileReviewsPanel,
  ProfileSavedPanel,
} from '@/features/profile/profile-personal-panels';
import { LogOut } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role === 'RESTAURANT_OWNER') {
      router.replace('/owner');
    } else if (user.role === 'ADMIN') {
      router.replace('/admin');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return null;
  }

  if (user.role === 'RESTAURANT_OWNER' || user.role === 'ADMIN') {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <BackButton className="mb-0" />
        <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
          <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Sign Out
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl">{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate">{user.name}</h1>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          {user.phone && (
            <p className="text-sm text-muted-foreground truncate">{user.phone}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Tabs defaultValue="saved">
        <TabsList className="w-full">
          <TabsTrigger value="reviews" className="flex-1">
            My Reviews
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1">
            Saved
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">
            Account
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="mt-4">
          <ProfileReviewsPanel />
        </TabsContent>
        <TabsContent value="saved" className="mt-4">
          <ProfileSavedPanel />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <ProfileAccountPanel showSignOut={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
