'use client';

import { Search } from 'lucide-react';

import { useMethodologyStore } from '@/features/methodology/store';

/**
 * Search bar trigger in the top bar. On desktop it shows the full pill with
 * the ⌘K hint; on mobile it collapses to a plain icon button.
 */
export function SearchTrigger() {
  const openSearch = useMethodologyStore((s) => s.openSearch);

  return (
    <>
      {/* Mobile: icon-only */}
      <button
        type="button"
        onClick={openSearch}
        aria-label="Open search palette"
        className="flex h-8 w-8 items-center justify-center rounded-pill border border-hairline text-fg-secondary transition-colors hover:border-subtle hover:text-fg md:hidden"
      >
        <Search className="h-3.5 w-3.5" />
      </button>

      {/* Desktop: full pill with kbd hint */}
      <button
        type="button"
        onClick={openSearch}
        aria-label="Open search palette (⌘K)"
        className="hidden items-center gap-2 rounded-pill border border-hairline bg-elevated px-3 py-1.5 text-xs text-fg-secondary transition-colors hover:border-subtle hover:text-fg md:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search techniques…</span>
        <kbd className="ml-2 rounded border border-hairline bg-panel px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-fg-muted">
          ⌘K
        </kbd>
      </button>
    </>
  );
}
