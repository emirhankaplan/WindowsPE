'use client';

/**
 * Mobile bottom-sheet menu for tools hidden from the top bar on small screens.
 * Provides access to: Analyze, Triage, Export, Keyboard shortcuts, Progress,
 * and the Target Context — all inaccessible via hidden md:flex buttons.
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Compass,
  Download,
  GraduationCap,
  Keyboard,
  Menu,
  Play,
  ScanSearch,
  Star,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { buildMarkdownReport, downloadTextFile } from '@/features/methodology/export';
import { useTree } from '@/features/methodology/hooks';
import { useMethodologyStore } from '@/features/methodology/store';
import { useResume } from '@/features/methodology/use-resume';
import { cn } from '@/lib/utils';

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [exported, setExported] = useState(false);

  const openAnalyzer = useMethodologyStore((s) => s.openAnalyzer);
  const openWizard = useMethodologyStore((s) => s.openWizard);
  const openStudy = useMethodologyStore((s) => s.openStudy);
  const openPlaybook = useMethodologyStore((s) => s.openPlaybook);
  const openHelp = useMethodologyStore((s) => s.openHelp);
  const openFavorites = useMethodologyStore((s) => s.openFavorites);
  const { data: tree } = useTree();
  const { done, total, remaining, nextNode, allComplete, resume } = useResume();

  const handleExport = useCallback(() => {
    if (!tree) return;
    const { progress, notes } = useMethodologyStore.getState();
    const md = buildMarkdownReport({ tree, progress, notes });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`windowspe-checklist-${stamp}.md`, md);
    setExported(true);
    window.setTimeout(() => setExported(false), 1500);
    setOpen(false);
  }, [tree]);

  const action = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <>
      {/* Hamburger trigger — only visible on mobile (< md) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-10 w-10 items-center justify-center rounded-pill border border-hairline text-fg-secondary transition-colors hover:border-subtle hover:text-fg md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Bottom sheet overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-canvas/70 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[20px] border-t border-subtle bg-panel pb-safe shadow-pop md:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-emphasis" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
                <span className="font-mono text-xs uppercase tracking-wider text-fg-muted">
                  WindowsPE tools
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-pill border border-hairline text-fg-secondary transition-colors hover:border-subtle hover:text-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Progress summary — doubles as the "resume" control: tap to
                  jump to the next unfinished technique and dismiss the sheet. */}
              {total > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!nextNode) return;
                    resume();
                    setOpen(false);
                  }}
                  disabled={allComplete}
                  aria-label={
                    allComplete
                      ? `All ${total} techniques complete`
                      : `Resume — go to ${nextNode?.title ?? 'next technique'}, ${remaining} unfinished`
                  }
                  className="w-full border-b border-hairline px-5 py-3 text-left transition-colors enabled:active:bg-elevated disabled:cursor-default"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-fg-secondary">
                      {allComplete ? (
                        <Trophy className="h-4 w-4 text-accent" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-severity-low" />
                      )}
                      Progress
                    </span>
                    {allComplete ? (
                      <span className="font-mono text-fg">{done}/{total}</span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-mono text-xs text-accent">
                        <span className="text-fg">{done}/{total}</span>
                        <Play className="h-3 w-3 fill-current" />
                        resume
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-pill bg-elevated">
                    <div
                      className="h-full rounded-pill bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-500"
                      style={{ width: total > 0 ? `${Math.round((done / total) * 100)}%` : '0%' }}
                    />
                  </div>
                </button>
              )}

              {/* Actions */}
              <nav className="flex flex-col gap-1 p-3">
                <MenuItem
                  icon={Star}
                  label="Favourites & Progress"
                  description="Starred techniques, per-phase breakdown, notes export"
                  onClick={() => action(openFavorites)}
                />
                <MenuItem
                  icon={ScanSearch}
                  label="Analyze tool output"
                  description="Paste whoami /priv, winPEAS…"
                  onClick={() => action(openAnalyzer)}
                />
                <MenuItem
                  icon={Compass}
                  label="Triage wizard"
                  description="Guided privilege escalation path"
                  onClick={() => action(openWizard)}
                />
                <MenuItem
                  icon={GraduationCap}
                  label="Study mode"
                  description="Flashcards & auto-generated quiz"
                  onClick={() => action(openStudy)}
                />
                <MenuItem
                  icon={Swords}
                  label="Playbook builder"
                  description="Sequence techniques into a kill chain"
                  onClick={() => action(openPlaybook)}
                />
                <MenuItem
                  icon={exported ? CheckCircle2 : Download}
                  label={exported ? 'Exported!' : 'Export checklist'}
                  description="Download progress as Markdown"
                  onClick={handleExport}
                  disabled={!tree}
                  className={exported ? 'text-severity-low' : undefined}
                />
                <MenuItem
                  icon={Keyboard}
                  label="Keyboard shortcuts"
                  description="All available keybindings"
                  onClick={() => action(openHelp)}
                />
              </nav>

              {/* Bottom safe area spacer */}
              <div className="h-4" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  description,
  onClick,
  disabled,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-card border border-transparent px-4 py-3 text-left transition-colors hover:border-hairline hover:bg-elevated active:bg-overlay',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-fg-secondary" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="text-xs text-fg-muted">{description}</p>
      </div>
    </button>
  );
}
