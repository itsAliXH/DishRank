'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Only show the bar if nav hasn't finished almost immediately. */
const SHOW_DELAY_MS = 40;
/** Chip only for genuinely slow loads — avoids flash on normal clicks. */
const HINT_DELAY_MS = 900;
const SAFETY_TIMEOUT_MS = 6_000;
const FINISH_HOLD_MS = 120;

function routeKey(pathname: string, search: string) {
  const q = search.replace(/^\?/, '');
  return q ? `${pathname}?${q}` : pathname;
}

/** Defer React updates so history patches during useInsertionEffect stay legal. */
function defer(fn: () => void) {
  window.setTimeout(fn, 0);
}

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const routeRef = useRef(routeKey(pathname, searchParams.toString()));
  const timersRef = useRef<number[]>([]);
  const showDelayRef = useRef<number | null>(null);
  const hintDelayRef = useRef<number | null>(null);
  const safetyRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const visibleRef = useRef(false);
  const startRef = useRef<() => void>(() => {});
  const finishRef = useRef<() => void>(() => {});

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (showDelayRef.current != null) {
      window.clearTimeout(showDelayRef.current);
      showDelayRef.current = null;
    }
    if (hintDelayRef.current != null) {
      window.clearTimeout(hintDelayRef.current);
      hintDelayRef.current = null;
    }
    if (safetyRef.current != null) {
      window.clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    const wasActive = activeRef.current;
    activeRef.current = false;
    clearTimers();

    if (!wasActive) return;

    // Fast navigations: bar never appeared — reset quietly.
    if (!visibleRef.current) {
      defer(() => {
        setShowHint(false);
        setVisible(false);
        setProgress(0);
      });
      return;
    }

    defer(() => {
      setShowHint(false);
      setProgress(100);
      timersRef.current.push(
        window.setTimeout(() => {
          visibleRef.current = false;
          setVisible(false);
          setProgress(0);
        }, FINISH_HOLD_MS),
      );
    });
  }, [clearTimers]);

  const start = useCallback(() => {
    if (activeRef.current) {
      // Already navigating — keep going, don't restart from 0 (feels stuck).
      return;
    }
    activeRef.current = true;
    clearTimers();

    showDelayRef.current = window.setTimeout(() => {
      visibleRef.current = true;
      setVisible(true);
      // Snappy early fill, then soft crawl — never sits near-full for seconds.
      setProgress(22);
      timersRef.current.push(window.setTimeout(() => setProgress(48), 90));
      timersRef.current.push(window.setTimeout(() => setProgress(68), 220));
      timersRef.current.push(window.setTimeout(() => setProgress(82), 450));
      timersRef.current.push(window.setTimeout(() => setProgress(91), 900));
    }, SHOW_DELAY_MS);

    hintDelayRef.current = window.setTimeout(() => {
      if (activeRef.current) setShowHint(true);
    }, HINT_DELAY_MS);

    safetyRef.current = window.setTimeout(() => {
      finishRef.current();
    }, SAFETY_TIMEOUT_MS);
  }, [clearTimers]);

  startRef.current = start;
  finishRef.current = finish;

  useEffect(() => {
    const next = routeKey(pathname, searchParams.toString());
    if (next !== routeRef.current) {
      routeRef.current = next;
      finishRef.current();
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const shouldStart = (
      raw: string | URL | null | undefined,
      mode: 'push' | 'replace' | 'click',
    ) => {
      if (raw == null) return false;
      try {
        const url = typeof raw === 'string' ? new URL(raw, window.location.href) : raw;
        if (url.origin !== window.location.origin) return false;

        // replaceState is used for tabs/filters — only show loader on real page changes.
        if (mode === 'replace') {
          return url.pathname !== window.location.pathname;
        }

        const next = routeKey(url.pathname, url.search);
        const current = routeKey(window.location.pathname, window.location.search);
        return next !== current;
      } catch {
        return false;
      }
    };

    const scheduleStart = () => {
      defer(() => startRef.current());
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      if (anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) {
        return;
      }
      if (anchor.hasAttribute('data-no-progress')) return;

      if (shouldStart(href, 'click')) scheduleStart();
    };

    const onPopState = () => scheduleStart();

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = ((data, unused, url) => {
      if (shouldStart(url, 'push')) scheduleStart();
      return originalPushState(data, unused, url);
    }) as History['pushState'];

    history.replaceState = ((data, unused, url) => {
      // Ignore query-only replaces (admin tabs, filters, near-me type toggle).
      if (shouldStart(url, 'replace')) scheduleStart();
      return originalReplaceState(data, unused, url);
    }) as History['replaceState'];

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      clearTimers();
      activeRef.current = false;
    };
  }, [clearTimers]);

  return (
    <>
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-[1200] h-[2.5px] overflow-hidden transition-opacity duration-100',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        role="progressbar"
        aria-hidden={!visible}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="nav-progress-bar h-full origin-left rounded-r-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        className={cn(
          'pointer-events-none fixed left-1/2 top-[calc(var(--safe-top)+0.85rem)] z-[1200] -translate-x-1/2 transition-all duration-200',
          showHint ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0',
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="nav-progress-chip flex items-center gap-2 rounded-full border border-border/70 bg-surface/95 px-3 py-1.5 backdrop-blur-md">
          <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
            <span className="absolute inset-0 rounded-full border-[1.5px] border-primary/20" />
            <span className="absolute inset-0 animate-spin rounded-full border-[1.5px] border-transparent border-t-primary" />
          </span>
          <span className="font-display text-[11px] font-semibold tracking-wide text-foreground">
            Loading
          </span>
        </div>
      </div>
    </>
  );
}

/** Top progress bar while App Router navigations resolve. */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
