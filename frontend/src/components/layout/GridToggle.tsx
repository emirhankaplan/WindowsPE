'use client';

import { Grid3x3 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Toggles the hairline grid overlay defined in `globals.css` via
 * `body.bg-grid`. Local state so we don't pollute the persisted store
 * with a viewport preference.
 */
export function GridToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('bg-grid', on);
    return () => {
      document.body.classList.remove('bg-grid');
    };
  }, [on]);

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      aria-label={on ? 'Hide grid overlay' : 'Show grid overlay'}
      title={on ? 'Hide grid overlay' : 'Show grid overlay'}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-pill border transition-colors',
        on
          ? 'border-accent/60 bg-accent/10 text-accent'
          : 'border-hairline text-fg-secondary hover:border-subtle hover:text-fg',
      )}
    >
      <Grid3x3 className="h-3.5 w-3.5" />
    </button>
  );
}
