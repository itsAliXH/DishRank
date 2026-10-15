'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!token) {
      setError('Reset link is missing or invalid.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setMessage('Password updated. You can sign in now.');
      setTimeout(() => router.replace('/'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mb-4 text-sm text-destructive" role="alert">
          This reset link is missing or invalid.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          Request a new reset link
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Reset password</h1>
      <p className="mb-6 text-sm text-muted-foreground">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-surface p-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="reset-password">
            New password
          </label>
          <Input
            id="reset-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="reset-confirm">
            Confirm new password
          </label>
          <Input
            id="reset-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-primary" role="status">
            {message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="text-primary underline-offset-2 hover:underline">
          Request another link
        </Link>
      </p>
    </main>
  );
}
