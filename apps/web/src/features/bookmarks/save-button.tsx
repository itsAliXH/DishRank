'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/features/auth/auth-dialog';
import { useAuth } from '@/providers/auth-context';
import { useBookmarks } from '@/providers/bookmarks-context';
import { cn } from '@/lib/utils';

type SaveButtonProps = {
  dishId: string;
  variant?: 'icon' | 'button' | 'card';
  className?: string;
  /** Stop click from navigating parent links (e.g. dish cards). */
  stopPropagation?: boolean;
};

export function SaveButton({
  dishId,
  variant = 'button',
  className,
  stopPropagation = false,
}: SaveButtonProps) {
  const { user } = useAuth();
  const { isSaved, toggle } = useBookmarks();
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const saved = isSaved(dishId);

  const onClick = async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await toggle(dishId);
    } catch (err) {
      console.error('Bookmark toggle failed', err);
    } finally {
      setBusy(false);
    }
  };

  const label = saved ? 'Saved' : 'Save';
  const aria = saved ? 'Unsave dish' : 'Save dish';

  const icon = (
    <Bookmark
      className={cn(
        variant === 'button' ? 'h-4 w-4 mr-1' : 'h-4 w-4',
        saved ? 'fill-primary text-primary' : 'fill-none text-foreground',
      )}
      strokeWidth={saved ? 1.75 : 2}
      aria-hidden="true"
    />
  );

  return (
    <>
      {variant === 'icon' || variant === 'card' ? (
        <button
          type="button"
          onClick={onClick}
          disabled={busy}
          aria-label={aria}
          aria-pressed={saved}
          title={aria}
          className={cn(
            'inline-flex items-center justify-center rounded-full transition-colors',
            variant === 'card'
              ? 'h-8 w-8 bg-surface/95 shadow-sm backdrop-blur-sm hover:bg-surface'
              : 'h-9 w-9 border border-border bg-surface hover:bg-muted',
            busy && 'opacity-60',
            className,
          )}
        >
          {icon}
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={onClick}
          disabled={busy}
          aria-pressed={saved}
          className={cn(saved && 'border-primary/40 text-primary', className)}
        >
          {icon}
          {busy ? '…' : label}
        </Button>
      )}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} redirectStaff={false} />
    </>
  );
}
