'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BackButton } from '@/components/shell/back-button';
import { cn } from '@/lib/utils';

export function FormPageShell({
  icon: Icon,
  title,
  subtitle,
  asideTitle,
  asideBody,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  asideTitle?: string;
  asideBody?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('page-container py-5 md:py-10', className)}>
      <BackButton />

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-12">
        <header className="relative overflow-hidden rounded-card border border-border/70 bg-surface px-5 py-6 sm:px-7 sm:py-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 80% 70% at 0% 0%, rgba(214, 31, 74, 0.14), transparent 55%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(27, 58, 95, 0.1), transparent 50%)',
            }}
          />
          <div className="relative">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-button bg-primary text-primary-foreground shadow-sm shadow-primary/25">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {subtitle}
            </p>
            {(asideTitle || asideBody) && (
              <div className="mt-6 border-t border-border/70 pt-5">
                {asideTitle && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {asideTitle}
                  </p>
                )}
                {asideBody && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{asideBody}</p>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-card border border-border bg-surface p-4 sm:p-6 shadow-[0_1px_0_rgba(22,20,18,0.04)]',
        className,
      )}
    >
      {(title || description) && (
        <div className="mb-5">
          {title && (
            <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function ModeToggle({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex w-full rounded-button border border-border bg-muted p-1 sm:w-auto">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'flex-1 rounded-button px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none',
            value === opt.id
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function FormSuccess({
  icon: Icon,
  title,
  message,
  children,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <div className="page-container py-10 md:py-16">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{message}</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
