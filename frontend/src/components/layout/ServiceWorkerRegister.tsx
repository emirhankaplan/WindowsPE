'use client';

import { useEffect } from 'react';

/**
 * Registers the offline service worker. Only runs in the browser, in
 * production builds (the dev server's HMR and the SW don't mix well), and is
 * a no-op where service workers aren't supported.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failures are non-fatal — the app works online either way.
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
