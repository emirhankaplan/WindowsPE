'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value` delayed by `delay` ms. Resets on every change so the
 * caller only sees the "settled" value after the user stops typing.
 */
export function useDebounced<T>(value: T, delay: number = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
