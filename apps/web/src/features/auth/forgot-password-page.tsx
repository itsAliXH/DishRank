'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.forgotPassword(email.trim());
      setMessage(res.message || 'If an account exists for that email, a reset link has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Forgot password</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter your account email and we&apos;ll send a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-surface p-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="forgot-email">
            Email
          </label>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
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
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/" className="text-primary underline-offset-2 hover:underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
