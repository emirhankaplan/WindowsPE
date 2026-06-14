'use client';

import { CheckCircle2, Play, Trophy } from 'lucide-react';
import { useEffect } from 'react';

import { useResume } from '@/features/methodology/use-resume';
import { cn } from '@/lib/utils';

/**
 * Overall progress across actionable nodes (techniques + tools — categories
 * and phase anchors aren't "doable" items so we exclude them).
 *
 * Beyond *showing* progress, the bar is now the app's **resume control**:
 * clicking it (or pressing `R`) jumps straight to the next technique you
 * haven't done or skipped, searching forward from wherever you are and
 * wrapping around. That turns a passive read-out into the fastest way to keep
 * grinding the playbook — no scrolling the graph to find your place.
 *
 * Counts + the "next" target are derived in `useResume` (memoised over the
 * React Query cache + the persisted progress slice), so the bar updates the
 * instant a node is marked done in the side panel.
 */
export function ProgressTracker() {
  const { done, skipped, total, remaining, nextNode, allComplete, resume } =
    useResume();

  // Global `R` shortcut — "Resume" the run. Mirrors the other tool hotkeys:
  // ignored while typing in a field or holding a modifier, and a no-op when
  // there's nothing left to resume.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      ) {
        return;
      }
      if (!nextNode) return;
      e.preventDefault();
      resume();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [nextNode, resume]);

  const ratio = total > 0 ? Math.min(done / total, 1) : 0;
  const percent = Math.round(ratio * 100);

  const canResume = !!nextNode;
  const label = allComplete
    ? `All ${total} techniques complete`
    : canResume
      ? `Resume — go to “${nextNode.title}” (${remaining} unfinished). Shortcut: R`
      : `Progress: ${done} of ${total} techniques completed`;

  return (
    <button
      type="button"
      onClick={resume}
      disabled={!canResume}
      aria-label={label}
      title={label}
      className={cn(
        'group hidden items-center gap-3 rounded-pill px-2 py-1 transition-colors md:flex',
        canResume
          ? 'cursor-pointer hover:bg-elevated'
          : 'cursor-default disabled:opacity-100',
      )}
    >
      <div className="flex items-center gap-1.5 font-mono text-xs">
        {allComplete ? (
          <Trophy className="h-3.5 w-3.5 text-accent" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-severity-low" />
        )}
        <span className="font-medium text-fg tabular-nums">{done}</span>
        <span className="text-fg-muted">/{total}</span>
        {skipped > 0 && (
          <span className="ml-1 text-fg-muted">
            <span aria-hidden>·</span>
            <span className="ml-1 tabular-nums">{skipped}</span> skipped
          </span>
        )}
      </div>

      <div className="relative h-1.5 w-32 overflow-hidden rounded-pill bg-elevated">
        <div
          className="h-full rounded-pill bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Resume affordance — a quiet play glyph that brightens on hover so the
          bar reads as clickable, swapped for the count when the run is done. */}
      {canResume ? (
        <span
          aria-hidden
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors group-hover:text-accent"
        >
          <Play className="h-3 w-3 fill-current" />
          resume
        </span>
      ) : (
        allComplete && (
          <span
            aria-hidden
            className="font-mono text-[10px] uppercase tracking-wider text-accent"
          >
            done
          </span>
        )
      )}
    </button>
  );
}
