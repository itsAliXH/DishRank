'use client';

import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SignInPromptProps {
  message: string;
  onSignIn: () => void;
  className?: string;
}

/** Compact auth nudge for forms that require a signed-in user. */
export function SignInPrompt({ message, onSignIn, className }: SignInPromptProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card border border-primary/20 bg-primary/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className,
      )}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <LogIn className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-medium text-foreground">Sign in to continue</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
        </div>
      </div>
      <Button type="button" size="sm" className="w-full shrink-0 sm:w-auto" onClick={onSignIn}>
        Sign In
      </Button>
    </div>
  );
}
