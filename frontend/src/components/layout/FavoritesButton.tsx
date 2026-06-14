'use client';

/**
 * TopBar button that opens the Favourites / Progress / Notes-Export panel.
 * Shows a count badge when the user has starred at least one node.
 */

import { Star } from 'lucide-react';
import { useEffect } from 'react';

import {
  selectFavorites,
  useMethodologyStore,
} from '@/features/methodology/store';
import { useMounted } from '@/lib/use-mounted';

export function FavoritesButton() {
  const openFavorites = useMethodologyStore((s) => s.openFavorites);
  const favorites = useMethodologyStore(selectFavorites);
  // The favourites slice is localStorage-persisted and hydrates synchronously
  // on the client, while the server rendered this button with zero favourites.
  // Render the badge only after mount so the first client render matches the
  // server HTML (no hydration mismatch); the count appears one paint later.
  const mounted = useMounted();
  const count = mounted
    ? Object.keys(favorites).filter((k) => favorites[k]).length
    : 0;

  // Global `V` shortcut (mnemonic: "View favourites").
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'v' && e.key !== 'V') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      openFavorites();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openFavorites]);

  return (
    <button
      type="button"
      onClick={openFavorites}
      aria-label={`Favourites, progress & notes export${count > 0 ? ` — ${count} starred` : ''} (V)`}
      title="Favourites, progress & notes export (V)"
      className="relative hidden h-8 items-center gap-1.5 rounded-pill border border-hairline px-3 text-xs text-fg-secondary transition-colors hover:border-amber-500/40 hover:text-amber-400 sm:flex"
    >
      <Star className={`h-3.5 w-3.5 ${count > 0 ? 'fill-amber-400 text-amber-400' : ''}`} />
      <span className="hidden md:inline">favourites</span>
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-pill bg-amber-500 px-1 font-mono text-[9px] font-bold text-canvas"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
