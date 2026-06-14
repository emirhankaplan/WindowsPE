'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * True after the component has hydrated on the client; false during SSR and
 * the very first client render.
 *
 * Why this exists: the Zustand store persists to `localStorage` with a
 * *synchronous* storage adapter, so on the client it is already hydrated with
 * the user's saved data before React's first render — while the server
 * rendered the HTML from the defaults. Any component that paints persisted
 * state in the initial shell (top-bar badges, target-context label) would
 * therefore mismatch and trigger React hydration errors. Gating those reads
 * behind `useMounted()` keeps the first client render byte-identical to the
 * server HTML; the real values appear one paint later.
 *
 * Implemented with `useSyncExternalStore` so the server snapshot (`false`)
 * and the client snapshot (`true`) are handled by React itself — no
 * `useEffect`/`setState` extra render pass, and it stays correct under
 * concurrent rendering.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
