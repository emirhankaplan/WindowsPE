'use client';

/**
 * Star/unstar button for a single node. Shows a filled star when favorited.
 * Renders as a pill to match the existing ProgressButton style in the panel.
 */

import { Star } from 'lucide-react';

import {
  selectNodeFavorite,
  useMethodologyStore,
} from '@/features/methodology/store';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  nodeId: string;
  /** Optional extra classes. */
  className?: string;
}

export function FavoriteButton({ nodeId, className }: FavoriteButtonProps) {
  const isFavorite = useMethodologyStore(selectNodeFavorite(nodeId));
  const toggleFavorite = useMethodologyStore((s) => s.toggleFavorite);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(nodeId)}
      aria-pressed={isFavorite}
      aria-label={
        isFavorite
          ? 'Remove from favourites — click to unstar'
          : 'Add to favourites — click to star'
      }
      title={isFavorite ? 'Starred — click to unstar' : 'Click to star this technique'}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-xs transition-colors',
        isFavorite
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
          : 'border-hairline bg-elevated text-fg-secondary hover:border-amber-500/30 hover:text-amber-400',
        className,
      )}
    >
      <Star
        className={cn(
          'h-3.5 w-3.5 transition-colors',
          isFavorite ? 'fill-current' : '',
        )}
      />
      {isFavorite ? 'Starred' : 'Star technique'}
    </button>
  );
}
