'use client';

/**
 * `useResume` — the shared "continue where I left off" hook.
 *
 * Reads the methodology tree (React Query cache) and the persisted progress
 * slice, derives the next unfinished technique relative to the current
 * selection, and exposes a `resume()` action that navigates to it the same way
 * every other in-app cross-link does (URL push + optimistic store select).
 *
 * Centralising this here keeps the progress tracker, the mobile menu, and the
 * favourites panel honest about what "resume" means — and means the heavy
 * lifting (ordering, wrap-around search) is memoised once per consumer rather
 * than recomputed inline.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useTree } from './hooks';
import { nextIncompleteNode, orderedActionableNodes, phaseEntryNode } from './resume';
import {
  selectProgress,
  selectSelectedNodeId,
  useMethodologyStore,
} from './store';
import type { NodeSummary } from './types';

export interface ResumeState {
  /** The next unfinished technique, or null when everything is complete / unloaded. */
  nextNode: NodeSummary | null;
  /** Navigate to `nextNode`. No-op (returns null) when there's nothing to resume. */
  resume: () => string | null;
  /** Navigate to a phase's first unfinished node. No-op when the phase is empty. */
  resumePhase: (phaseId: string) => string | null;
  total: number;
  done: number;
  skipped: number;
  /** Techniques neither done nor skipped. */
  remaining: number;
  /** True once every actionable node is done or skipped. */
  allComplete: boolean;
  /** False until the tree has loaded — lets callers avoid flashing a resume CTA. */
  hasData: boolean;
}

export function useResume(): ResumeState {
  const { data: tree } = useTree();
  const progress = useMethodologyStore(selectProgress);
  const selectedNodeId = useMethodologyStore(selectSelectedNodeId);
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const router = useRouter();

  const { ordered, total, done, skipped } = useMemo(() => {
    if (!tree) return { ordered: [] as NodeSummary[], total: 0, done: 0, skipped: 0 };
    const ordered = orderedActionableNodes(tree);
    let done = 0;
    let skipped = 0;
    for (const node of ordered) {
      const status = progress[node.id];
      if (status === 'done') done += 1;
      else if (status === 'skipped') skipped += 1;
    }
    return { ordered, total: ordered.length, done, skipped };
  }, [tree, progress]);

  const nextNode = useMemo(
    () => nextIncompleteNode(ordered, progress, selectedNodeId),
    [ordered, progress, selectedNodeId],
  );

  const navigate = useCallback(
    (node: NodeSummary | null): string | null => {
      if (!node) return null;
      // Optimistically select so the panel swaps immediately, then push the URL
      // so the node is deep-linkable / back-button-friendly — identical to the
      // cross-link navigation in the detail panel.
      selectNode(node.id);
      router.push(`/node/${encodeURIComponent(node.id)}`);
      return node.id;
    },
    [selectNode, router],
  );

  const resume = useCallback(() => navigate(nextNode), [navigate, nextNode]);

  const resumePhase = useCallback(
    (phaseId: string) => navigate(phaseEntryNode(ordered, progress, phaseId)),
    [navigate, ordered, progress],
  );

  const remaining = Math.max(0, total - done - skipped);

  return {
    nextNode,
    resume,
    resumePhase,
    total,
    done,
    skipped,
    remaining,
    allComplete: total > 0 && remaining === 0,
    hasData: !!tree,
  };
}
