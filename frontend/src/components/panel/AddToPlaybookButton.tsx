'use client';

/**
 * "Add to playbook" affordance for the node detail panel.
 *
 * Appends the current technique to the active kill-chain playbook (creating a
 * default one on first use), then briefly confirms inline and offers a jump
 * straight into the builder. Pure store interaction — no network.
 */

import { CheckCircle2, Swords } from 'lucide-react';
import { useState } from 'react';

import { useMethodologyStore } from '@/features/methodology/store';
import { cn } from '@/lib/utils';

export function AddToPlaybookButton({ nodeId }: { nodeId: string }) {
  const addNode = useMethodologyStore((s) => s.addNodeToActivePlaybook);
  const openPlaybook = useMethodologyStore((s) => s.openPlaybook);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addNode(nodeId);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleAdd}
        aria-label={added ? 'Added to playbook' : 'Add this technique to your kill-chain playbook'}
        className={cn(
          'inline-flex min-h-[44px] items-center gap-2 rounded-pill border px-3 py-1.5 text-xs transition-colors',
          added
            ? 'border-accent/40 bg-accent/10 text-accent'
            : 'border-hairline bg-elevated text-fg-secondary hover:border-accent/50 hover:text-accent',
        )}
      >
        {added ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Swords className="h-3.5 w-3.5" />}
        {added ? 'Added to playbook' : 'Add to playbook'}
      </button>
      {added && (
        <button
          type="button"
          onClick={openPlaybook}
          className="inline-flex min-h-[44px] items-center rounded-pill px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:text-accent"
        >
          open
        </button>
      )}
    </span>
  );
}
