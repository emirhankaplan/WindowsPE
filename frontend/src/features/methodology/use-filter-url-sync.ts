'use client';

/**
 * Two-way sync between the canvas filters and the URL query string, so a
 * filtered view is shareable / bookmarkable:
 *
 *   /?sev=critical,high&diff=oscp-basic&tag=potato
 *
 * On mount we hydrate the store from the URL (opening the filter bar if any
 * facet is present). Thereafter every filter change is written back with
 * `history.replaceState` — no Next.js navigation, so it never remounts the
 * canvas or pushes history entries.
 */

import { useEffect, useRef } from 'react';

import {
  selectFilters,
  useMethodologyStore,
} from './store';
import type { Difficulty, Severity } from './types';

const SEVERITIES: Severity[] = ['info', 'low', 'medium', 'high', 'critical'];
const DIFFICULTIES: Difficulty[] = ['oscp-basic', 'oscp-advanced', 'red-team'];

function parseList<T extends string>(raw: string | null, allowed: T[]): T[] {
  if (!raw) return [];
  const set = new Set(allowed);
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is T => set.has(s as T));
}

export function useFilterUrlSync() {
  const filters = useMethodologyStore(selectFilters);
  const setFilters = useMethodologyStore((s) => s.setFilters);
  const setFilterBarOpen = useMethodologyStore((s) => s.setFilterBarOpen);

  // Skip the very first write so the mount-time read isn't clobbered by an
  // empty-filters write before the hydrated state has rendered.
  const skipFirstWrite = useRef(true);

  // Hydrate from URL once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const severities = parseList(params.get('sev'), SEVERITIES);
    const difficulties = parseList(params.get('diff'), DIFFICULTIES);
    const tag = params.get('tag');
    if (severities.length > 0 || difficulties.length > 0 || tag) {
      setFilters({ severities, difficulties, tag: tag || null });
      setFilterBarOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to URL on change.
  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (filters.severities.length > 0) params.set('sev', filters.severities.join(','));
    else params.delete('sev');
    if (filters.difficulties.length > 0) params.set('diff', filters.difficulties.join(','));
    else params.delete('diff');
    if (filters.tag) params.set('tag', filters.tag);
    else params.delete('tag');

    const qs = params.toString();
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (qs ? `?${qs}` : ''),
    );
  }, [filters]);
}
