'use client';

import { Keyboard } from 'lucide-react';

import { useMethodologyStore } from '@/features/methodology/store';

/** Opens the keyboard-shortcuts overlay (also bound to the `?` key). */
export function HelpButton() {
  const openHelp = useMethodologyStore((s) => s.openHelp);

  return (
    <button
      type="button"
      onClick={openHelp}
      aria-label="Keyboard shortcuts (?)"
      title="Keyboard shortcuts (?)"
      className="flex h-8 w-8 items-center justify-center rounded-pill border border-hairline text-fg-secondary transition-colors hover:border-subtle hover:text-fg"
    >
      <Keyboard className="h-3.5 w-3.5" />
    </button>
  );
}
