'use client';

import { useReactFlow } from '@xyflow/react';
import { Layers, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useTree } from '@/features/methodology/hooks';
import { selectProgress, useMethodologyStore } from '@/features/methodology/store';
import { cn } from '@/lib/utils';

interface PhaseRow {
  id: string;
  title: string;
  ordinal: number;
  done: number;
  total: number;
  nodeIds: string[];
}

/**
 * Collapsible per-phase legend. Each row shows how many actionable nodes in
 * that phase are marked done, and clicking it flies the canvas to fit that
 * phase's cards (via React Flow's imperative `fitView`). Lives inside the
 * ReactFlow provider (rendered through a `<Panel>`), so `useReactFlow` is
 * valid here.
 */
export function PhaseLegend() {
  const [open, setOpen] = useState(false);
  const { data } = useTree();
  const progress = useMethodologyStore(selectProgress);
  const { fitView } = useReactFlow();

  const rows = useMemo<PhaseRow[]>(() => {
    if (!data) return [];
    return [...data.phases]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((p) => {
        const phaseNodes = data.nodes.filter((n) => n.phase_id === p.id);
        const actionable = phaseNodes.filter(
          (n) => n.kind === 'technique' || n.kind === 'tool',
        );
        const done = actionable.filter((n) => progress[n.id] === 'done').length;
        return {
          id: p.id,
          title: p.title,
          ordinal: p.ordinal,
          done,
          total: actionable.length,
          // Include the phase anchor so the framing has a little headroom.
          nodeIds: [`phase:${p.id}`, ...phaseNodes.map((n) => n.id)],
        };
      });
  }, [data, progress]);

  if (rows.length === 0) return null;

  const focusPhase = (nodeIds: string[]) => {
    fitView({
      nodes: nodeIds.map((id) => ({ id })),
      duration: 600,
      padding: 0.25,
    });
  };

  return (
    <div className="pointer-events-auto w-64">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-pill border border-hairline bg-panel/80 px-3 py-1.5 text-xs text-fg-secondary backdrop-blur-md transition-colors hover:border-subtle hover:text-fg"
      >
        <Layers className="h-3.5 w-3.5" />
        <span className="font-mono uppercase tracking-wider">phases</span>
        <span className="ml-auto font-mono text-[10px] text-fg-muted">{rows.length}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-card border border-subtle bg-panel/95 p-1.5 shadow-pop backdrop-blur-md">
          {rows.map((r) => {
            const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
            const complete = r.total > 0 && r.done === r.total;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => focusPhase(r.nodeIds)}
                title={`Focus ${r.title}`}
                className="group flex w-full items-center gap-2.5 rounded-input px-2 py-1.5 text-left transition-colors hover:bg-elevated"
              >
                <span className="w-4 shrink-0 font-mono text-[10px] text-accent">
                  {String(r.ordinal).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-fg group-hover:text-accent">
                    {r.title}
                  </span>
                  <span className="mt-1 block h-1 w-full overflow-hidden rounded-pill bg-elevated">
                    <span
                      className={cn(
                        'block h-full rounded-pill transition-[width] duration-500',
                        complete
                          ? 'bg-severity-low'
                          : 'bg-gradient-to-r from-accent to-accent-strong',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-fg-muted">
                  {r.done}/{r.total}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
