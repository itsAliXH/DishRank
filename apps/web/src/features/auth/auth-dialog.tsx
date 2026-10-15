'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-context';
import { dashboardPathForUser } from '@/lib/auth-routes';
import { cn } from '@/lib/utils';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'login' | 'register';
  /** When false, stay on the current page after auth (e.g. save/rate flows). */
  redirectStaff?: boolean;
}

export function AuthDialog({
  open,
  onOpenChange,
  defaultTab = 'login',
  redirectStaff = true,
}: AuthDialogProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { login, register } = useAuth();

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setError('');
      setFormKey((k) => k + 1);
    }
  }, [open, defaultTab]);

  const switchTab = (next: 'login' | 'register') => {
    if (next === tab) return;
    setTab(next);
    setError('');
    setFormKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user =
        tab === 'login'
          ? await login(email, password)
          : await register(name, email, phone, password);
      onOpenChange(false);
      if (redirectStaff) {
        const dashboard = dashboardPathForUser(user);
        if (dashboard) router.push(dashboard);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setErrorKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </DialogTitle>
          <p
            key={`sub-${tab}`}
            className="animate-slide-up text-sm text-muted-foreground"
          >
            {tab === 'login'
              ? 'Welcome back — pick up where you left off.'
              : 'Join DishRank and start rating dishes.'}
          </p>
        </DialogHeader>

        <div
          className="relative mb-1 flex rounded-button bg-muted/70 p-1"
          role="tablist"
          aria-label="Auth mode"
        >
          <div
            aria-hidden="true"
            className={cn(
              'absolute inset-y-1 w-[calc(50%-4px)] rounded-button bg-surface shadow-soft transition-all duration-300 ease-soft',
              tab === 'login' ? 'left-1' : 'left-1/2',
            )}
          />
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={cn(
              'relative z-10 flex-1 rounded-button py-2 text-sm font-medium transition-colors duration-200',
              tab === 'login' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => switchTab('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'register'}
            className={cn(
              'relative z-10 flex-1 rounded-button py-2 text-sm font-medium transition-colors duration-200',
              tab === 'register' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => switchTab('register')}
          >
            Sign Up
          </button>
        </div>

        <form key={formKey} onSubmit={handleSubmit} className="space-y-3">
          {tab === 'register' && (
            <>
              <div className="animate-slide-up stagger-1">
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  aria-label="Name"
                />
              </div>
              <div className="animate-slide-up stagger-2">
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  aria-label="Phone"
                />
              </div>
            </>
          )}
          <div className={cn('animate-slide-up', tab === 'register' ? 'stagger-3' : 'stagger-1')}>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email"
            />
          </div>
          <div className={cn('animate-slide-up', tab === 'register' ? 'stagger-4' : 'stagger-2')}>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              aria-label="Password"
            />
          </div>
          {tab === 'login' && (
            <div className="animate-slide-up stagger-3 -mt-1 text-right">
              <button
                type="button"
                className="text-sm text-primary underline-offset-2 transition-opacity hover:underline hover:opacity-80"
                onClick={() => {
                  onOpenChange(false);
                  router.push('/forgot-password');
                }}
              >
                Forgot password?
              </button>
            </div>
          )}
          {error && (
            <p
              key={errorKey}
              className="animate-shake text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className={cn('animate-slide-up pt-1', tab === 'register' ? 'stagger-5' : 'stagger-4')}>
            <Button
              type="submit"
              className={cn(
                'w-full transition-transform duration-200 ease-soft',
                loading && 'animate-soft-pulse',
                !loading && 'active:scale-[0.98]',
              )}
              disabled={loading}
            >
              {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
