'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo } from 'react';

import {
  selectNodeDimmedByFocus,
  useMethodologyStore,
} from '@/features/methodology/store';
import { cn } from '@/lib/utils';

import { getPhaseIcon } from './icons';

// Intersect with `Record<string, unknown>` so the type satisfies React
// Flow v12's `Node<T>` constraint without a runtime cast.
export type PhaseNodeData = {
  title: string;
  ordinal: number;
  icon: string | null;
  nodeCount: number;
} & Record<string, unknown>;

export type PhaseRfNode = Node<PhaseNodeData, 'phase'>;

/**
 * Phase anchor card.
 *
 * Visual language: glass surface (`bg-panel/60` + `backdrop-blur-md`), 1px
 * hairline border at rest, accent-tinted ring + soft outer glow on hover.
 * The ordinal floats as a chip on the top edge so the card body stays
 * uncluttered.
 */
function PhaseNodeImpl({
  id,
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<PhaseRfNode>) {
  const Icon = getPhaseIcon(data.icon);
  const dimmedByFocus = useMethodologyStore(selectNodeDimmedByFocus(id));

  return (
    <div
      className={cn(
        'group relative w-[300px] rounded-card border border-hairline bg-panel/60 px-5 py-4 backdrop-blur-md transition-all duration-300 ease-out hover:border-accent/40 hover:bg-panel/80 hover:shadow-[0_0_0_1px_rgba(91,229,192,0.45),0_8px_32px_rgba(91,229,192,0.12)]',
        dimmedByFocus && 'opacity-20',
      )}
    >
      {/* Floating ordinal chip — sits on the top edge so the card itself
          doesn't have to carry the "phase N" text inline. */}
      <span className="absolute -top-2 left-4 select-none rounded-pill border border-hairline bg-canvas px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-fg-muted transition-colors group-hover:border-accent/40 group-hover:text-accent">
        phase&nbsp;{String(data.ordinal).padStart(2, '0')}
      </span>

      {/* Handles are visually invisible; React Flow needs them to route
          edges but the design hides their dots. */}
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        className="!h-2 !w-2 !border-none !bg-transparent !opacity-0"
      />
      <Handle
        type="source"
        position={sourcePosition ?? Position.Right}
        className="!h-2 !w-2 !border-none !bg-accent/70"
      />

      <div className="flex items-center gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent transition-all duration-300 group-hover:border-accent/60 group-hover:bg-accent/20 group-hover:shadow-glow">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight tracking-tight text-fg">
            {data.title}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
            {data.nodeCount}&nbsp;techniques
          </div>
        </div>
      </div>
    </div>
  );
}

export const PhaseNode = memo(PhaseNodeImpl);
