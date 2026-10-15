import { Suspense } from 'react';
import ResetPasswordPage from '@/features/auth/reset-password-page';

export default function Page() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-4 py-10 text-sm text-muted-foreground">Loading…</main>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
