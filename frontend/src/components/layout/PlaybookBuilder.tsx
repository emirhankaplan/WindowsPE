'use client';

/**
 * PlaybookBuilder — kill-chain composer.
 *
 * A frontend-only layer on top of the methodology graph that lets the user
 * assemble selected techniques into an ordered attack/defence scenario, add
 * per-step operator notes, reorder steps, and export the whole chain to
 * Markdown. Playbooks persist in the Zustand store (localStorage); nothing
 * hits the network.
 *
 * Opened from the TopBar "playbook" button, the mobile menu, the `P` keyboard
 * shortcut, or the command palette. Techniques are added either from inside
 * the builder (search picker) or from the node detail panel's
 * "Add to playbook" button.
 *
 * Structure:
 *   PlaybookBuilder (Dialog shell)
 *     └ BuilderContent
 *         ├ PlaybookTabs   — switch / create / delete playbooks
 *         ├ MetaEditor     — name + objective for the active playbook
 *         ├ StepList       — ordered steps (reorder / note / remove)
 *         └ AddTechnique   — search-and-add picker
 */

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  ListOrdered,
  Plus,
  Search,
  Swords,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { SeverityBadge } from '@/components/panel/SeverityBadge';
import { copyToClipboard } from '@/features/snippets/clipboard';
import { useTree } from '@/features/methodology/hooks';
import {
  selectActivePlaybookId,
  selectPlaybookOpen,
  selectPlaybooks,
  useMethodologyStore,
} from '@/features/methodology/store';
import type { Methodology, NodeSummary } from '@/features/methodology/types';
import {
  buildPlaybookMarkdown,
  resolveSteps,
} from '@/features/playbook/export';
import { downloadTextFile } from '@/features/methodology/export';
import type { Playbook } from '@/features/playbook/types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function PlaybookBuilder() {
  const open = useMethodologyStore(selectPlaybookOpen);
  const closePlaybook = useMethodologyStore((s) => s.closePlaybook);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? undefined : closePlaybook())}>
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
                className="fixed left-1/2 top-[6vh] z-50 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-card border border-subtle bg-panel shadow-pop outline-none"
                style={{ maxHeight: '88vh' }}
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <VisuallyHidden>
                  <Dialog.Title>Playbook — kill-chain builder</Dialog.Title>
                  <Dialog.Description>
                    Assemble selected techniques into an ordered attack scenario,
                    add operator notes, and export the kill chain as Markdown.
                  </Dialog.Description>
                </VisuallyHidden>
                <BuilderContent onClose={closePlaybook} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

function BuilderContent({ onClose }: { onClose: () => void }) {
  const { data: tree } = useTree();
  const playbooks = useMethodologyStore(selectPlaybooks);
  const activeId = useMethodologyStore(selectActivePlaybookId);
  const createPlaybook = useMethodologyStore((s) => s.createPlaybook);

  // The active playbook, falling back to the first one if the stored active id
  // is stale (e.g. the active playbook was just deleted).
  const active = useMemo(
    () => playbooks.find((p) => p.id === activeId) ?? playbooks[0] ?? null,
    [playbooks, activeId],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Swords className="h-4 w-4 text-accent" />
          Kill-chain builder
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close playbook builder"
          className="flex h-11 w-11 items-center justify-center rounded-pill border border-hairline text-fg-secondary transition-colors hover:border-accent hover:text-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {!tree ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-fg-muted">Loading methodology…</p>
        </div>
      ) : playbooks.length === 0 ? (
        <EmptyAll onCreate={() => createPlaybook('My kill chain')} />
      ) : active ? (
        <>
          <PlaybookTabs playbooks={playbooks} activeId={active.id} />
          <div className="flex-1 overflow-y-auto px-4 pb-5 pt-4">
            <MetaEditor playbook={active} tree={tree} />
            <StepList playbook={active} tree={tree} onClose={onClose} />
            <AddTechnique playbook={active} tree={tree} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function EmptyAll({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-card border border-hairline bg-elevated/60">
        <GitBranch className="h-6 w-6 text-accent" />
      </div>
      <div className="max-w-sm">
        <p className="text-sm text-fg">
          Build a <strong className="text-fg">kill chain</strong> from the
          methodology.
        </p>
        <p className="mt-1.5 text-sm text-fg-secondary">
          Sequence techniques into an ordered attack scenario, annotate each
          step, and export the whole chain as Markdown for your report.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="flex h-12 items-center justify-center gap-2 rounded-card border border-accent/30 bg-accent/5 px-5 text-sm font-medium text-accent transition-colors hover:border-accent/50 hover:bg-accent/10"
      >
        <Plus className="h-4 w-4" />
        New playbook
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Playbook tabs (switch / create / delete)
// ---------------------------------------------------------------------------

function PlaybookTabs({
  playbooks,
  activeId,
}: {
  playbooks: Playbook[];
  activeId: string;
}) {
  const setActive = useMethodologyStore((s) => s.setActivePlaybook);
  const createPlaybook = useMethodologyStore((s) => s.createPlaybook);
  const deletePlaybook = useMethodologyStore((s) => s.deletePlaybook);

  const handleDelete = (p: Playbook) => {
    if (
      window.confirm(
        `Delete playbook "${p.name}"? This removes its ${p.steps.length} step${p.steps.length === 1 ? '' : 's'}.`,
      )
    ) {
      deletePlaybook(p.id);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-hairline px-4 py-2">
      {playbooks.map((p) => {
        const isActive = p.id === activeId;
        return (
          <div
            key={p.id}
            className={cn(
              'group flex shrink-0 items-center rounded-pill border transition-colors',
              isActive
                ? 'border-accent/50 bg-accent/10'
                : 'border-hairline hover:border-subtle',
            )}
          >
            <button
              type="button"
              onClick={() => setActive(p.id)}
              aria-pressed={isActive}
              className={cn(
                'flex min-h-[40px] items-center gap-1.5 rounded-l-pill py-1 pl-3 pr-2 text-xs',
                isActive ? 'text-accent' : 'text-fg-secondary hover:text-fg',
              )}
            >
              <span className="max-w-[12rem] truncate">{p.name || 'Untitled'}</span>
              <span className="font-mono text-[10px] tabular-nums opacity-70">
                {p.steps.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleDelete(p)}
              aria-label={`Delete playbook ${p.name}`}
              className="flex h-9 w-8 items-center justify-center rounded-r-pill text-fg-muted transition-colors hover:text-severity-critical"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => createPlaybook('New playbook')}
        aria-label="New playbook"
        title="New playbook"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-dashed border-hairline text-fg-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meta editor — name, objective, export
// ---------------------------------------------------------------------------

function MetaEditor({ playbook, tree }: { playbook: Playbook; tree: Methodology }) {
  const renamePlaybook = useMethodologyStore((s) => s.renamePlaybook);
  const setObjective = useMethodologyStore((s) => s.setPlaybookObjective);
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    const md = buildPlaybookMarkdown(playbook, tree);
    const slug =
      (playbook.name || 'playbook')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'playbook';
    downloadTextFile(`windowspe-${slug}.md`, md);
  };

  const handleCopy = async () => {
    const md = buildPlaybookMarkdown(playbook, tree);
    const ok = await copyToClipboard(md);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="mb-4 rounded-card border border-hairline bg-elevated/50 p-3">
      <label className="block">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
          Playbook name
        </span>
        <input
          type="text"
          value={playbook.name}
          onChange={(e) => renamePlaybook(playbook.id, e.target.value)}
          placeholder="e.g. SeImpersonate → SYSTEM"
          aria-label="Playbook name"
          className="w-full rounded-input border border-hairline bg-canvas px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-accent placeholder:text-fg-muted"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
          Objective / scenario
        </span>
        <textarea
          value={playbook.objective}
          onChange={(e) => setObjective(playbook.id, e.target.value)}
          rows={2}
          placeholder="What does this chain achieve, and against what target?"
          aria-label="Playbook objective"
          className="w-full resize-y rounded-input border border-hairline bg-canvas px-3 py-2 text-sm leading-relaxed text-fg outline-none transition-colors focus:border-accent placeholder:text-fg-muted"
        />
      </label>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          <ListOrdered className="h-3.5 w-3.5" />
          {playbook.steps.length} step{playbook.steps.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={playbook.steps.length === 0}
            aria-label="Copy kill chain as Markdown to clipboard"
            className={cn(
              'flex min-h-[44px] items-center gap-1.5 rounded-pill border px-3 text-xs font-medium transition-colors',
              copied
                ? 'border-severity-low/40 bg-severity-low/10 text-severity-low'
                : 'border-hairline text-fg-secondary hover:border-accent/50 hover:text-accent',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={playbook.steps.length === 0}
            className={cn(
              'flex min-h-[44px] items-center gap-1.5 rounded-pill border px-4 text-xs font-medium transition-colors',
              'border-accent/30 bg-accent/5 text-accent hover:border-accent/50 hover:bg-accent/10',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            <Download className="h-3.5 w-3.5" />
            Export Markdown
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step list
// ---------------------------------------------------------------------------

function StepList({
  playbook,
  tree,
  onClose,
}: {
  playbook: Playbook;
  tree: Methodology;
  onClose: () => void;
}) {
  const router = useRouter();
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const moveStep = useMethodologyStore((s) => s.moveStep);
  const removeStep = useMethodologyStore((s) => s.removeStep);
  const setStepNote = useMethodologyStore((s) => s.setStepNote);

  const resolved = useMemo(() => resolveSteps(playbook, tree), [playbook, tree]);

  const goToNode = (id: string) => {
    onClose();
    selectNode(id);
    router.push(`/node/${encodeURIComponent(id)}`);
  };

  if (resolved.length === 0) {
    return (
      <div className="mb-4 flex flex-col items-center gap-2 rounded-card border border-dashed border-hairline px-4 py-8 text-center">
        <Target className="h-6 w-6 text-fg-muted" />
        <p className="text-sm text-fg-secondary">
          No steps yet. Search below to add your first technique.
        </p>
      </div>
    );
  }

  return (
    <ol className="mb-4 space-y-2">
      {resolved.map((step, i) => (
        <li
          key={step.uid}
          className="rounded-card border border-hairline bg-elevated/40 p-3"
        >
          <div className="flex items-start gap-3">
            {/* Ordinal + reorder controls */}
            <div className="flex flex-col items-center gap-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-pill bg-accent/10 font-mono text-xs font-bold tabular-nums text-accent">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveStep(playbook.id, step.uid, -1)}
                  disabled={i === 0}
                  aria-label={`Move step ${i + 1} up`}
                  className="flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(playbook.id, step.uid, 1)}
                  disabled={i === resolved.length - 1}
                  aria-label={`Move step ${i + 1} down`}
                  className="flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {step.node ? (
                    <>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <SeverityBadge severity={step.node.severity} />
                        {step.phaseTitle && (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                            {step.phaseOrdinal != null
                              ? `${String(step.phaseOrdinal).padStart(2, '0')} `
                              : ''}
                            {step.phaseTitle}
                          </span>
                        )}
                        {step.node.mitre_attack_id && (
                          <span className="rounded-pill border border-accent-alt/40 bg-accent-alt-dim px-1.5 py-0.5 font-mono text-[10px] text-accent-alt">
                            {step.node.mitre_attack_id}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => goToNode(step.nodeId)}
                        className="group mt-1 flex items-center gap-1 text-left text-sm font-medium text-fg transition-colors hover:text-accent"
                      >
                        {step.node.title}
                        <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-fg-muted">
                      Missing technique{' '}
                      <code className="font-mono text-xs">{step.nodeId}</code>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeStep(playbook.id, step.uid)}
                  aria-label={`Remove step ${i + 1}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-hairline text-fg-muted transition-colors hover:border-severity-critical/50 hover:text-severity-critical"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <textarea
                value={step.note}
                onChange={(e) => setStepNote(playbook.id, step.uid, e.target.value)}
                rows={2}
                placeholder="Operator notes — objective, expected output, caveats…"
                aria-label={`Notes for step ${i + 1}`}
                className="mt-2 w-full resize-y rounded-input border border-hairline bg-canvas px-2.5 py-1.5 text-xs leading-relaxed text-fg-secondary outline-none transition-colors focus:border-accent placeholder:text-fg-muted"
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Add technique — local search-and-add picker
// ---------------------------------------------------------------------------

const ADDABLE_KINDS = new Set<NodeSummary['kind']>(['category', 'technique', 'tool']);
const PICKER_LIMIT = 8;

function AddTechnique({
  playbook,
  tree,
}: {
  playbook: Playbook;
  tree: Methodology;
}) {
  const addStep = useMethodologyStore((s) => s.addStepToPlaybook);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = tree.nodes.filter((n) => ADDABLE_KINDS.has(n.kind));
    if (q.length < 1) return pool.slice(0, PICKER_LIMIT);
    return pool
      .filter((n) => {
        if (n.title.toLowerCase().includes(q)) return true;
        if (n.mitre_attack_id?.toLowerCase().includes(q)) return true;
        return n.tags.some((t) => t.toLowerCase().includes(q));
      })
      .slice(0, PICKER_LIMIT);
  }, [tree.nodes, query]);

  const handleAdd = (id: string) => {
    addStep(playbook.id, id);
    setQuery('');
  };

  return (
    <div className="rounded-card border border-hairline bg-elevated/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-fg transition-colors hover:text-accent"
      >
        <Plus className="h-4 w-4 text-accent" />
        Add a technique
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 text-fg-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="border-t border-hairline p-3">
          <div className="flex items-center gap-2 rounded-input border border-hairline bg-canvas px-2.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search techniques, tags, MITRE id…"
              aria-label="Search techniques to add"
              className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
            />
          </div>

          <ul className="mt-2 space-y-1">
            {matches.length === 0 ? (
              <li className="px-2 py-4 text-center text-xs text-fg-muted">
                No techniques match “{query}”.
              </li>
            ) : (
              matches.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(n.id)}
                    className="group flex min-h-[44px] w-full items-center gap-2.5 rounded-input border border-transparent px-2.5 py-2 text-left transition-colors hover:border-hairline hover:bg-elevated"
                  >
                    <SeverityBadge severity={n.severity} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm text-fg group-hover:text-accent">
                      {n.title}
                    </span>
                    {n.mitre_attack_id && (
                      <span className="hidden font-mono text-[10px] text-fg-muted sm:inline">
                        {n.mitre_attack_id}
                      </span>
                    )}
                    <Plus className="h-3.5 w-3.5 shrink-0 text-fg-muted transition-colors group-hover:text-accent" />
                  </button>
                </li>
              ))
            )}
          </ul>
          {query.trim().length < 1 && (
            <p className="mt-1.5 px-2 font-mono text-[10px] text-fg-muted">
              <ArrowRight className="mr-1 inline h-3 w-3 -translate-y-px" />
              start typing to filter all techniques
            </p>
          )}
        </div>
      )}
    </div>
  );
}
