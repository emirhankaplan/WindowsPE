'use client';

/**
 * FavoritesPanel — starred techniques, learning progress breakdown,
 * and personal notes Markdown export.
 *
 * Opened via the ★ button in the TopBar or the `V` keyboard shortcut.
 * Everything is frontend-only: state lives in the persisted Zustand slice
 * (localStorage), no network calls.
 *
 * Three tabs:
 *  1. Favorites  — all starred nodes with their progress status.
 *  2. Progress   — overall % + per-phase breakdown bar chart.
 *  3. Export     — export *only* personal notes as a clean Markdown doc.
 */

import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  FileText,
  MinusCircle,
  NotebookText,
  Play,
  Star,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import {
  buildNotesMarkdownExport,
  downloadTextFile,
} from '@/features/methodology/export';
import { copyToClipboard } from '@/features/snippets/clipboard';
import { useTree } from '@/features/methodology/hooks';
import {
  selectFavorites,
  selectFavoritesOpen,
  selectProgress,
  useMethodologyStore,
} from '@/features/methodology/store';
import { useResume } from '@/features/methodology/use-resume';
import type { NodeSummary, ProgressStatus } from '@/features/methodology/types';
import { cn } from '@/lib/utils';

import { SeverityBadge } from '@/components/panel/SeverityBadge';

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function FavoritesPanel() {
  const open = useMethodologyStore(selectFavoritesOpen);
  const closeFavorites = useMethodologyStore((s) => s.closeFavorites);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? undefined : closeFavorites())}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-canvas/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed left-1/2 top-[8vh] z-50 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-card border border-subtle bg-panel shadow-pop outline-none"
                style={{ maxHeight: '84vh' }}
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <VisuallyHidden>
                  <Dialog.Title>Favorites, Progress & Notes Export</Dialog.Title>
                  <Dialog.Description>
                    View your starred techniques, learning progress breakdown, and export personal notes.
                  </Dialog.Description>
                </VisuallyHidden>

                <PanelContent onClose={closeFavorites} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Panel content (tabs)
// ---------------------------------------------------------------------------

function PanelContent({ onClose }: { onClose: () => void }) {
  const favorites = useMethodologyStore(selectFavorites);
  const favoriteCount = Object.keys(favorites).length;

  return (
    <Tabs.Root defaultValue="favorites" className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3">
        <Tabs.List
          aria-label="Panel sections"
          className="flex items-center gap-1"
        >
          <TabTrigger value="favorites" icon={Star}>
            Favorites
            {favoriteCount > 0 && (
              <span className="ml-1.5 rounded-pill bg-accent/15 px-1.5 py-px font-mono text-[10px] text-accent">
                {favoriteCount}
              </span>
            )}
          </TabTrigger>
          <TabTrigger value="progress" icon={CheckCircle2}>
            Progress
          </TabTrigger>
          <TabTrigger value="export" icon={FileText}>
            Notes Export
          </TabTrigger>
        </Tabs.List>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="flex h-7 w-7 min-h-[44px] min-w-[44px] items-center justify-center rounded-pill border border-hairline text-fg-secondary transition-colors hover:border-accent hover:text-accent"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* Tab bodies */}
      <div className="flex-1 overflow-y-auto">
        <Tabs.Content value="favorites" className="outline-none">
          <FavoritesTab onClose={onClose} />
        </Tabs.Content>
        <Tabs.Content value="progress" className="outline-none">
          <ProgressTab onClose={onClose} />
        </Tabs.Content>
        <Tabs.Content value="export" className="outline-none">
          <ExportTab />
        </Tabs.Content>
      </div>
    </Tabs.Root>
  );
}

// ---------------------------------------------------------------------------
// Tab trigger helper
// ---------------------------------------------------------------------------

function TabTrigger({
  value,
  icon: Icon,
  children,
}: {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'flex items-center gap-1.5 rounded-input px-3 py-1.5 font-mono text-xs text-fg-muted transition-colors',
        'hover:bg-elevated hover:text-fg',
        'data-[state=active]:bg-elevated data-[state=active]:text-accent',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </Tabs.Trigger>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Favorites
// ---------------------------------------------------------------------------

function FavoritesTab({ onClose }: { onClose: () => void }) {
  const favorites = useMethodologyStore(selectFavorites);
  const clearFavorites = useMethodologyStore((s) => s.clearFavorites);
  const toggleFavorite = useMethodologyStore((s) => s.toggleFavorite);
  const progress = useMethodologyStore(selectProgress);
  const { data: tree } = useTree();
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const router = useRouter();

  const favoriteNodes = useMemo<NodeSummary[]>(() => {
    if (!tree) return [];
    const ids = new Set(Object.keys(favorites).filter((k) => favorites[k]));
    return tree.nodes.filter((n) => ids.has(n.id));
  }, [tree, favorites]);

  const handleNavigate = (id: string) => {
    onClose();
    selectNode(id);
    router.push(`/node/${encodeURIComponent(id)}`);
  };

  if (favoriteNodes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Star className="h-8 w-8 text-fg-muted" />
        <p className="text-sm text-fg-secondary">No favourites yet.</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          Open any technique and tap the ★ button to star it.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
          {favoriteNodes.length} starred technique{favoriteNodes.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Clear all favourites?')) clearFavorites();
          }}
          aria-label="Clear all favourites"
          className="flex items-center gap-1.5 rounded border border-hairline px-2 py-1 font-mono text-[10px] text-fg-muted transition-colors hover:border-severity-critical/40 hover:text-severity-critical"
        >
          <Trash2 className="h-3 w-3" />
          clear all
        </button>
      </div>

      <ul className="space-y-1.5">
        {favoriteNodes.map((node) => {
          const status = progress[node.id] as ProgressStatus | undefined;
          return (
            <li key={node.id}>
              <div
                className={cn(
                  'group flex items-center gap-3 rounded-card border border-hairline bg-elevated/50 px-3 py-2.5 transition-colors',
                  'hover:border-accent/30 hover:bg-elevated',
                )}
              >
                {/* Navigate button area */}
                <button
                  type="button"
                  onClick={() => handleNavigate(node.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-label={`Open ${node.title}`}
                >
                  <SeverityBadge severity={node.severity} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">
                      {node.title}
                    </span>
                    <span className="font-mono text-[10px] text-fg-muted">
                      {node.phase_id}
                    </span>
                  </span>
                  {/* Progress badge */}
                  {status === 'done' && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-severity-low" />
                  )}
                  {status === 'skipped' && (
                    <MinusCircle className="h-4 w-4 shrink-0 text-fg-muted" />
                  )}
                </button>

                {/* Unstar button */}
                <button
                  type="button"
                  onClick={() => toggleFavorite(node.id)}
                  aria-label={`Remove ${node.title} from favourites`}
                  className="shrink-0 rounded p-1 text-accent transition-colors hover:text-severity-critical"
                >
                  <Star className="h-3.5 w-3.5 fill-current" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Progress breakdown
// ---------------------------------------------------------------------------

function ProgressTab({ onClose }: { onClose: () => void }) {
  const progress = useMethodologyStore(selectProgress);
  const { data: tree } = useTree();
  const { nextNode, allComplete, remaining, resume, resumePhase } = useResume();

  const handleResume = () => {
    if (resume()) onClose();
  };
  const handleResumePhase = (phaseId: string) => {
    if (resumePhase(phaseId)) onClose();
  };

  const stats = useMemo(() => {
    if (!tree) return null;

    const actionableNodes = tree.nodes.filter(
      (n) => n.kind === 'technique' || n.kind === 'tool',
    );
    const total = actionableNodes.length;
    let done = 0;
    let skipped = 0;
    for (const s of Object.values(progress)) {
      if (s === 'done') done += 1;
      else if (s === 'skipped') skipped += 1;
    }
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const phases = [...tree.phases].sort((a, b) => a.ordinal - b.ordinal);
    const byPhase = phases.map((phase) => {
      const phaseNodes = actionableNodes.filter((n) => n.phase_id === phase.id);
      const phaseTotal = phaseNodes.length;
      let phaseDone = 0;
      let phaseSkipped = 0;
      for (const n of phaseNodes) {
        const s = progress[n.id];
        if (s === 'done') phaseDone += 1;
        else if (s === 'skipped') phaseSkipped += 1;
      }
      return {
        phase,
        total: phaseTotal,
        done: phaseDone,
        skipped: phaseSkipped,
        pct: phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0,
      };
    });

    return { total, done, skipped, pct, byPhase };
  }, [tree, progress]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-fg-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Overall summary card */}
      <div className="mb-5 rounded-card border border-hairline bg-elevated/60 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
            Overall Progress
          </span>
          <span className="font-mono text-2xl font-bold text-accent tabular-nums">
            {stats.pct}%
          </span>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={stats.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${stats.pct}% complete`}
          className="relative h-2.5 w-full overflow-hidden rounded-pill bg-canvas"
        >
          <div
            className="h-full rounded-pill bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-700 ease-out"
            style={{ width: `${stats.pct}%` }}
          />
        </div>

        <div className="mt-2.5 flex gap-4 font-mono text-xs text-fg-muted">
          <span>
            <span className="font-semibold text-severity-low">{stats.done}</span>{' '}
            done
          </span>
          <span>
            <span className="font-semibold text-fg">{stats.skipped}</span> skipped
          </span>
          <span>
            <span className="font-semibold text-fg-secondary">
              {stats.total - stats.done - stats.skipped}
            </span>{' '}
            remaining
          </span>
          <span className="ml-auto">
            <span className="font-semibold text-fg">{stats.total}</span> total
          </span>
        </div>

        {/* Resume CTA — pick the run back up at the next unfinished technique. */}
        {allComplete ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-card border border-accent/30 bg-accent/5 py-2.5 font-mono text-xs text-accent">
            <Trophy className="h-4 w-4" />
            Every technique complete — nice work.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResume}
            disabled={!nextNode}
            aria-label={
              nextNode
                ? `Resume — go to ${nextNode.title}, ${remaining} unfinished`
                : 'Nothing to resume'
            }
            className={cn(
              'mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-card border text-sm font-medium transition-all',
              'border-accent/30 bg-accent/5 text-accent hover:border-accent/50 hover:bg-accent/10',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {nextNode ? (
              <span className="min-w-0 truncate">
                Resume:{' '}
                <span className="font-semibold">{nextNode.title}</span>
              </span>
            ) : (
              'Nothing to resume'
            )}
          </button>
        )}
      </div>

      {/* Per-phase breakdown — tap a phase to jump to its next unfinished node. */}
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
        By phase
      </p>
      <ul className="space-y-2">
        {stats.byPhase
          .filter((p) => p.total > 0)
          .map(({ phase, total, done, skipped, pct }) => {
            const phaseComplete = done + skipped >= total;
            return (
              <li key={phase.id}>
                <button
                  type="button"
                  onClick={() => handleResumePhase(phase.id)}
                  aria-label={
                    phaseComplete
                      ? `${phase.title} — complete. Open phase.`
                      : `${phase.title} — ${done} of ${total} done. Jump to next unfinished.`
                  }
                  className="group w-full rounded-card border border-transparent px-2 py-1.5 text-left transition-colors hover:border-hairline hover:bg-elevated/60"
                >
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-xs text-fg-secondary">
                      <span className="mr-0.5 font-mono text-[10px] text-fg-muted">
                        {String(phase.ordinal).padStart(2, '0')}
                      </span>
                      <span className="truncate">{phase.title}</span>
                      <ChevronRight className="h-3 w-3 shrink-0 -translate-x-1 text-fg-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-accent" />
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-muted">
                      {done}/{total}
                      <span className="ml-1.5 text-accent">{pct}%</span>
                    </span>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-pill bg-canvas">
                    {/* Skipped layer */}
                    {skipped > 0 && (
                      <div
                        className="absolute left-0 top-0 h-full rounded-pill bg-fg-muted/30"
                        style={{
                          width: `${total > 0 ? Math.round(((done + skipped) / total) * 100) : 0}%`,
                        }}
                      />
                    )}
                    {/* Done layer */}
                    <div
                      className="absolute left-0 top-0 h-full rounded-pill bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Notes Export
// ---------------------------------------------------------------------------

function ExportTab() {
  const { data: tree } = useTree();
  const [exported, setExported] = useState(false);
  const [copied, setCopied] = useState(false);

  const notesCount = useMethodologyStore(
    (s) =>
      Object.values(s.notes).filter((n) => n && n.trim() !== '').length,
  );

  const handleExport = () => {
    if (!tree) return;
    const { notes, progress } = useMethodologyStore.getState();
    const md = buildNotesMarkdownExport({ tree, notes, progress });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`windowspe-notes-${stamp}.md`, md);
    setExported(true);
    window.setTimeout(() => setExported(false), 1500);
  };

  const handleCopy = async () => {
    if (!tree) return;
    const { notes, progress } = useMethodologyStore.getState();
    const md = buildNotesMarkdownExport({ tree, notes, progress });
    const ok = await copyToClipboard(md);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Description */}
      <div className="rounded-card border border-hairline bg-elevated/60 p-4">
        <div className="flex items-start gap-3">
          <NotebookText className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-medium text-fg">Personal Notes Export</p>
            <p className="mt-1 text-sm text-fg-secondary">
              Exports only the techniques where you&apos;ve written personal notes
              &mdash; perfect for dropping into your exam report or Obsidian vault.
              Includes progress status and MITRE ATT&amp;CK IDs.
            </p>
            {notesCount === 0 && (
              <p className="mt-2 font-mono text-[10px] text-fg-muted">
                No notes yet — open any technique and write in the Notes section.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={BookOpen} label="Techniques with notes" value={notesCount} />
        <ProgressStatCard />
      </div>

      {/* Export + copy actions */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleExport}
          disabled={!tree}
          aria-label="Export personal notes as Markdown"
          className={cn(
            'flex h-11 w-full items-center justify-center gap-2.5 rounded-card border text-sm font-medium transition-all',
            exported
              ? 'border-severity-low/40 bg-severity-low/10 text-severity-low'
              : 'border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 hover:border-accent/50',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {exported ? (
            <>
              <Check className="h-4 w-4" />
              Notes exported!
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export notes as Markdown
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!tree}
          aria-label="Copy personal notes as Markdown to clipboard"
          className={cn(
            'flex h-10 w-full items-center justify-center gap-2 rounded-card border text-xs font-medium transition-all',
            copied
              ? 'border-severity-low/40 bg-severity-low/10 text-severity-low'
              : 'border-hairline text-fg-secondary hover:border-accent/50 hover:text-accent',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied to clipboard!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy to clipboard
            </>
          )}
        </button>
      </div>

      <p className="text-center font-mono text-[10px] text-fg-muted">
        All data is stored locally in your browser. Nothing is sent to a server.
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-card border border-hairline bg-elevated/50 px-4 py-3">
      <div className="flex items-center gap-2 text-fg-muted">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-fg">{value}</p>
    </div>
  );
}

function ProgressStatCard() {
  const progress = useMethodologyStore(selectProgress);
  const { data: tree } = useTree();

  const { pct, done, total } = useMemo(() => {
    const actionable =
      tree?.nodes.filter((n) => n.kind === 'technique' || n.kind === 'tool')
        .length ?? 0;
    let done = 0;
    for (const s of Object.values(progress)) {
      if (s === 'done') done += 1;
    }
    const pct = actionable > 0 ? Math.round((done / actionable) * 100) : 0;
    return { pct, done, total: actionable };
  }, [progress, tree]);

  return (
    <div className="rounded-card border border-hairline bg-elevated/50 px-4 py-3">
      <div className="flex items-center gap-2 text-fg-muted">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="font-mono text-[10px] uppercase tracking-wider">
          Learning Progress
        </span>
      </div>
      <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-accent">
        {pct}%
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-fg-muted">
        {done}/{total} techniques
      </p>
    </div>
  );
}
