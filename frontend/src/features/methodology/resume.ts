/**
 * "Resume your run" — pure helpers for continuing through the methodology.
 *
 * The app already tracks per-node progress (done / skipped) and lets you walk
 * a single phase via prev/next. What it lacked was a single answer to the
 * question a learner grinding the OSCP actually asks: *"what's the next thing
 * I haven't done yet?"* — across the whole methodology, from wherever I am.
 *
 * These functions are deliberately framework-free and side-effect-free so the
 * progress tracker, the mobile menu, and the favourites panel can all share
 * one definition of "next unfinished" instead of re-deriving it three ways.
 */

import type { Methodology, NodeSummary, ProgressStatus } from './types';

/** Only techniques and tools are "doable" — phase/category anchors aren't. */
const ACTIONABLE_KINDS = new Set(['technique', 'tool']);

export function isActionable(node: Pick<NodeSummary, 'kind'>): boolean {
  return ACTIONABLE_KINDS.has(node.kind);
}

/** A node counts as complete once it's been marked done *or* deliberately skipped. */
function isComplete(status: ProgressStatus | undefined): boolean {
  return status === 'done' || status === 'skipped';
}

/**
 * Actionable nodes in canonical methodology order: phase ordinal first, then
 * their original position within the payload. Stable — equal keys keep their
 * input order — so "next" is deterministic regardless of the server's node
 * ordering within a phase.
 */
export function orderedActionableNodes(tree: Methodology): NodeSummary[] {
  const ordinalOf = new Map<string, number>();
  for (const phase of tree.phases) ordinalOf.set(phase.id, phase.ordinal);

  return tree.nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => isActionable(node))
    .sort((a, b) => {
      const oa = ordinalOf.get(a.node.phase_id) ?? Number.MAX_SAFE_INTEGER;
      const ob = ordinalOf.get(b.node.phase_id) ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.index - b.index;
    })
    .map(({ node }) => node);
}

/**
 * The next actionable node that is neither done nor skipped, searching forward
 * from `fromId` and wrapping around the end. When `fromId` is null/unknown the
 * search starts at the top, so an empty selection resumes at the first
 * unfinished technique. Returns null only when *everything* is complete.
 */
export function nextIncompleteNode(
  ordered: NodeSummary[],
  progress: Record<string, ProgressStatus>,
  fromId: string | null,
): NodeSummary | null {
  if (ordered.length === 0) return null;

  const found = fromId ? ordered.findIndex((n) => n.id === fromId) : -1;
  const start = found >= 0 ? found : -1;

  // Walk the full ring exactly once. Starting at step 1 means we advance past
  // the current node, so pressing "resume" repeatedly cycles through the
  // remaining work instead of sticking on the node you're already reading.
  for (let step = 1; step <= ordered.length; step += 1) {
    const idx = (start + step + ordered.length) % ordered.length;
    const node = ordered[idx]!;
    if (!isComplete(progress[node.id])) return node;
  }
  return null;
}

/**
 * The entry point for a single phase: its first unfinished actionable node,
 * or — if the whole phase is already complete — its first node, so a tap on a
 * finished phase still takes you somewhere sensible. Null when the phase has
 * no actionable nodes at all.
 */
export function phaseEntryNode(
  ordered: NodeSummary[],
  progress: Record<string, ProgressStatus>,
  phaseId: string,
): NodeSummary | null {
  const inPhase = ordered.filter((n) => n.phase_id === phaseId);
  if (inPhase.length === 0) return null;
  return inPhase.find((n) => !isComplete(progress[n.id])) ?? inPhase[0]!;
}
