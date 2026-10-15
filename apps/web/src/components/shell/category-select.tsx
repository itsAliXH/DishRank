'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Category } from '@dishrank/shared';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CategorySelectProps {
  valueId: string;
  valueName: string;
  onChange: (next: { id: string; name: string }) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  /** Kept for callers — menu portals above dialogs. */
  variant?: 'dropdown' | 'inline';
}

type MenuCoords = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const MENU_MAX = 260;

export function CategorySelect({
  valueId,
  valueName,
  onChange,
  disabled,
  placeholder = 'Type to find a category…',
  className,
  allowClear,
}: CategorySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState(valueName);
  const [options, setOptions] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<MenuCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setQuery(valueName);
  }, [valueName]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await api.searchCategories(query.trim() || undefined);
        if (!cancelled) setOptions(list);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  useLayoutEffect(() => {
    if (!open) {
      setMenu(null);
      return;
    }

    const updatePosition = () => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const preferBottom = spaceBelow >= 160 || spaceBelow >= spaceAbove;
      const available = preferBottom ? spaceBelow : spaceAbove;
      const height = Math.max(140, Math.min(MENU_MAX, available));

      setMenu({
        top: preferBottom ? rect.bottom + gap : Math.max(8, rect.top - gap - height),
        left: rect.left,
        width: rect.width,
        height,
      });
    };

    updatePosition();

    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && listRef.current?.contains(target)) return;
      if (target === listRef.current) return;
      updatePosition();
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, options.length, loading]);

  const pick = (c: Category) => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    onChange({ id: c.id, name: c.name });
    setQuery(c.name);
    setOpen(false);
  };

  const list =
    open && mounted && menu
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="fixed z-[1100] rounded-button border border-border bg-surface shadow-lift"
            style={{
              top: menu.top,
              left: menu.left,
              width: menu.width,
              height: menu.height,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              // Radix Dialog sets pointer-events:none on body; re-enable for this menu.
              pointerEvents: 'auto',
            }}
            onWheel={(e) => {
              e.stopPropagation();
            }}
          >
            {loading && (
              <li className="px-3 py-2.5 text-xs text-muted-foreground">Searching…</li>
            )}
            {!loading && options.length === 0 && (
              <li className="px-3 py-2.5 text-xs text-muted-foreground">
                No matching category. Ask an admin to add it.
              </li>
            )}
            {!loading &&
              options.map((c) => (
                <li key={c.id} className="border-b border-border/50 last:border-0">
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.id === valueId}
                    className={cn(
                      'w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted',
                      c.id === valueId && 'bg-primary/10 font-medium text-primary',
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pick(c);
                    }}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Input
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 180);
        }}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          if (allowClear && !next.trim()) {
            onChange({ id: '', name: '' });
          } else if (valueId && next !== valueName) {
            onChange({ id: '', name: next });
          }
        }}
      />

      {list}

      {valueId ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{valueName}</span>
        </p>
      ) : query.trim() ? (
        <p className="mt-2 text-[11px] text-amber-700">Pick a category from the list.</p>
      ) : null}
    </div>
  );
}
