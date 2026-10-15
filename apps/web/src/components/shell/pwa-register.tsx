'use client';

import { useEffect } from 'react';

async function unregisterAllServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Dev / Docker next dev: strip any leftover SW so API isn't dual-fetched
    if (process.env.NODE_ENV !== 'production') {
      unregisterAllServiceWorkers().catch(() => {});
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
