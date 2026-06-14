'use client';

import { Crosshair, Filter, Share2, X } from 'lucide-react';
import { useMemo } from 'react';

import { useTree } from '@/features/methodology/hooks';
import {
  selectActiveFilterCount,
  selectFilterBarOpen,
  selectFilters,
  selectFocusMode,
  selectShowLinks,
  useMethodologyStore,
} from '@/features/methodology/store';
import type { Difficulty, Severity } from '@/features/methodology/types';
import { cn } from '@/lib/utils';

const SEVERITIES: Severity[] = ['info', 'low', 'medium', 'high', 'critical'];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'oscp-basic', label: 'OSCP basic' },
  { value: 'oscp-advanced', label: 'OSCP adv' },
  { value: 'red-team', label: 'Red team' },
];

const DIFFICULTY_TOKEN: Record<Difficulty, string> = {
  'oscp-basic': 'basic',
  'oscp-advanced': 'advanced',
  'red-team': 'red',
};

/**
 * Floating canvas filter. Dims non-matching technique cards (the dimming
 * itself lives in `TechniqueNode`, which subscribes to the same filter
 * slice — so toggling a facet never re-runs the dagre layout).
 */
export function FilterBar() {
  const open = useMethodologyStore(selectFilterBarOpen);
  const toggleOpen = useMethodologyStore((s) => s.toggleFilterBar);
  const filters = useMethodologyStore(selectFilters);
  const activeCount = useMethodologyStore(selectActiveFilterCount);
  const toggleSeverity = useMethodologyStore((s) => s.toggleSeverityFilter);
  const toggleDifficulty = useMethodologyStore((s) => s.toggleDifficultyFilter);
  const setTag = useMethodologyStore((s) => s.setTagFilter);
  const clearFilters = useMethodologyStore((s) => s.clearFilters);
  const showLinks = useMethodologyStore(selectShowLinks);
  const toggleShowLinks = useMethodologyStore((s) => s.toggleShowLinks);
  const focusMode = useMethodologyStore(selectFocusMode);
  const toggleFocusMode = useMethodologyStore((s) => s.toggleFocusMode);

  const { data } = useTree();

  // Unique tags across the tree, sorted by frequency then alphabetically so
  // the most useful filters surface first.
  const tags = useMemo(() => {
    if (!data) return [] as string[];
    const counts = new Map<string, number>();
    for (const n of data.nodes) {
      for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([t]) => t);
  }, [data]);

  return (
    <div className="pointer-events-auto">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={`${open ? 'Close' : 'Open'} canvas filters${activeCount > 0 ? ` (${activeCount} active)` : ''}`}
        className={cn(
          'flex min-h-[44px] items-center gap-2 rounded-pill border px-3 py-1.5 text-xs backdrop-blur-md transition-colors sm:min-h-0',
          activeCount > 0
            ? 'border-accent/60 bg-accent/10 text-accent'
            : 'border-hairline bg-panel/80 text-fg-secondary hover:border-subtle hover:text-fg',
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        <span className="font-mono uppercase tracking-wider">filters</span>
        {activeCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-pill bg-accent px-1 font-mono text-[10px] font-semibold text-fg-inverse">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 w-[min(288px,_calc(100vw-24px))] rounded-card border border-subtle bg-panel/95 p-4 shadow-pop backdrop-blur-md">
          {/* Overlay / focus toggles */}
          <Group label="Overlay">
            <div className="space-y-1.5">
              <ToggleRow
                icon={Share2}
                label="Show relationships"
                active={showLinks}
                onClick={toggleShowLinks}
              />
              <ToggleRow
                icon={Crosshair}
                label="Focus selected path"
                active={focusMode}
                onClick={toggleFocusMode}
              />
            </div>
            {showLinks && (
              <div className="mt-2 flex items-center gap-4 px-1 font-mono text-[10px] text-fg-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-t-2 border-accent-alt" />
                  prerequisite
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-t-2 border-dashed border-accent" />
                  related
                </span>
              </div>
            )}
            {focusMode && (
              <p className="mt-2 px-1 font-mono text-[10px] leading-relaxed text-fg-muted">
                Select a technique to highlight its lineage; everything else
                fades back.
              </p>
            )}
          </Group>

          {/* Severity */}
          <Group label="Severity">
            <div className="flex flex-wrap gap-1.5">
              {SEVERITIES.map((s) => {
                const active = filters.severities.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSeverity(s)}
                    aria-pressed={active}
                    aria-label={`Filter by ${s} severity${active ? ' (active)' : ''}`}
                    className={cn(
                      'rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-all',
                      active ? 'opacity-100' : 'opacity-50 hover:opacity-90',
                    )}
                    style={{
                      color: `var(--color-severity-${s})`,
                      borderColor: `color-mix(in srgb, var(--color-severity-${s}) ${active ? 70 : 35}%, transparent)`,
                      backgroundColor: `color-mix(in srgb, var(--color-severity-${s}) ${active ? 18 : 6}%, transparent)`,
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Group>

          {/* Difficulty */}
          <Group label="Difficulty">
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTIES.map(({ value, label }) => {
                const active = filters.difficulties.includes(value);
                const token = DIFFICULTY_TOKEN[value];
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDifficulty(value)}
                    aria-pressed={active}
                    aria-label={`Filter by ${label} difficulty${active ? ' (active)' : ''}`}
                    className={cn(
                      'rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-all',
                      active ? 'opacity-100' : 'opacity-50 hover:opacity-90',
                    )}
                    style={{
                      color: `var(--color-difficulty-${token})`,
                      borderColor: `color-mix(in srgb, var(--color-difficulty-${token}) ${active ? 70 : 35}%, transparent)`,
                      backgroundColor: `color-mix(in srgb, var(--color-difficulty-${token}) ${active ? 16 : 6}%, transparent)`,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Group>

          {/* Tags */}
          {tags.length > 0 && (
            <Group label={`Tag${filters.tag ? `: ${filters.tag}` : ''}`}>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">
                {tags.map((t) => {
                  const active = filters.tag === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(active ? null : t)}
                      aria-pressed={active}
                      aria-label={`Filter by tag: ${t}${active ? ' (active — click to clear)' : ''}`}
                      className={cn(
                        'rounded-pill border px-2 py-0.5 font-mono text-[10px] transition-colors',
                        active
                          ? 'border-accent/60 bg-accent/10 text-accent'
                          : 'border-hairline text-fg-secondary hover:border-subtle hover:text-fg',
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Group>
          )}

          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-input border border-hairline bg-elevated px-3 py-1.5 text-xs text-fg-secondary transition-colors hover:border-severity-critical/50 hover:text-severity-critical"
            >
              <X className="h-3 w-3" />
              clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Share2;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-2 rounded-input border px-2.5 py-1.5 text-xs transition-colors',
        active
          ? 'border-accent/50 bg-accent/10 text-fg'
          : 'border-hairline bg-elevated text-fg-secondary hover:border-subtle hover:text-fg',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">{label}</span>
      <span
        className={cn(
          'flex h-4 w-7 items-center rounded-pill p-0.5 transition-colors',
          active ? 'bg-accent/70' : 'bg-emphasis',
        )}
      >
        <span
          className={cn(
            'h-3 w-3 rounded-full bg-fg transition-transform',
            active && 'translate-x-3',
          )}
        />
      </span>
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        {label}
      </p>
      {children}
    </div>
  );
}
