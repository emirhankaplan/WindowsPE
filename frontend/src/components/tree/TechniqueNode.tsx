'use client';

import {
  ArrowDown,
  CheckCircle2,
  MinusCircle,
} from 'lucide-react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, type KeyboardEvent } from 'react';

import {
  nodeMatchesFilters,
  selectFilters,
  selectNodeDimmedByFocus,
  selectNodeProgress,
  useMethodologyStore,
} from '@/features/methodology/store';
import type { NodeSummary } from '@/features/methodology/types';
import { cn } from '@/lib/utils';

// Intersect with `Record<string, unknown>` so the type satisfies React Flow
// v12's `Node<T>` constraint without runtime casts.
export type TechniqueNodeData = {
  node: NodeSummary;
  /** True only for the very first technique of phase 1 — drives the
   *  Start Here halo + chip. */
  isStart?: boolean;
} & Record<string, unknown>;

export type TechniqueRfNode = Node<TechniqueNodeData, 'technique'>;

function TechniqueNodeImpl({
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<TechniqueRfNode>) {
  const { node, isStart } = data;

  const isSelected = useMethodologyStore((s) => s.selectedNodeId === node.id);
  const progress = useMethodologyStore(selectNodeProgress(node.id));
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const filters = useMethodologyStore(selectFilters);
  const dimmedByFocus = useMethodologyStore(selectNodeDimmedByFocus(node.id));
  const router = useRouter();

  // A node fades back (and stops intercepting clicks) when it's filtered out
  // or off the focused lineage — either way the matching nodes pop. The tree
  // shape is always preserved.
  const dimmed = !nodeMatchesFilters(node, filters) || dimmedByFocus;

  // Mouse activation is owned by the canvas (`onNodeClick`); this covers the
  // keyboard path so a focused node opens on Enter / Space — React Flow makes
  // the node focusable but does not wire its click handler to the keyboard.
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      selectNode(node.id);
      router.push(`/node/${encodeURIComponent(node.id)}`);
    },
    [node.id, selectNode, router],
  );

  return (
    <div
      className={cn(
        'relative transition-opacity duration-300',
        dimmed && 'pointer-events-none opacity-20',
      )}
    >
      {/* Start Here floating chip — sits above the card, pulses gently. */}
      {isStart && (
        <div
          className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-pill border border-accent/60 bg-accent/15 px-2.5 py-1 backdrop-blur-md animate-pulse-glow"
        >
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-accent">
            start here
          </span>
          <ArrowDown className="h-3 w-3 text-accent" />
        </div>
      )}

      <div
        data-severity={node.severity}
        role="button"
        tabIndex={dimmed ? -1 : 0}
        aria-hidden={dimmed || undefined}
        aria-label={`${node.title} — ${node.severity} severity. Press Enter to open details.`}
        aria-current={isSelected ? 'true' : undefined}
        onKeyDown={onKeyDown}
        className={cn(
          'group relative w-[280px] cursor-pointer overflow-hidden rounded-card border bg-panel/70 px-4 py-3 backdrop-blur-md transition-all duration-200 ease-out focus-visible:rounded-card',
          isStart
            ? 'border-accent/60 animate-start-halo'
            : isSelected
              ? 'border-accent/60 shadow-[0_0_0_1px_var(--color-accent),0_0_28px_rgba(91,229,192,0.25)]'
              : 'border-hairline hover:border-accent/30 hover:shadow-[0_0_0_1px_rgba(91,229,192,0.32),0_4px_24px_rgba(0,0,0,0.45)]',
        )}
      >
        {/* Severity gradient fading rightward — softer than a solid stripe.
            18% tint over the first 56px of the card. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-14"
          style={{
            background: `linear-gradient(to right, color-mix(in srgb, var(--color-severity-${node.severity}) 18%, transparent), transparent)`,
          }}
        />

        {/* Severity dot in the top-right with a matching halo. */}
        <div
          aria-hidden
          className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: `var(--color-severity-${node.severity})`,
            boxShadow: `0 0 10px color-mix(in srgb, var(--color-severity-${node.severity}) 70%, transparent)`,
          }}
        />

        <Handle
          type="target"
          position={targetPosition ?? Position.Left}
          className="!h-1.5 !w-1.5 !border-none !bg-transparent !opacity-0"
        />
        <Handle
          type="source"
          position={sourcePosition ?? Position.Right}
          className="!h-1.5 !w-1.5 !border-none !bg-transparent !opacity-0"
        />

        <div className="relative">
          <div className="flex items-start gap-2 pr-3">
            <div className="flex-1 text-[13px] font-medium leading-snug tracking-tight text-fg">
              {node.title}
            </div>
            {progress === 'done' && (
              <CheckCircle2
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-severity-low"
                aria-label="completed"
              />
            )}
            {progress === 'skipped' && (
              <MinusCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted"
                aria-label="skipped"
              />
            )}
          </div>

          <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-fg-secondary">
            {node.summary}
          </p>

          {/* MITRE ATT&CK id — minimal mono caps, no badge background. */}
          {node.mitre_attack_id && (
            <div className="mt-2.5 font-mono text-[9.5px] uppercase tracking-[0.15em] text-accent-alt/70 transition-colors group-hover:text-accent-alt">
              {node.mitre_attack_id}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const TechniqueNode = memo(TechniqueNodeImpl);
