'use client';

/**
 * Global keyboard shortcuts + the `?` help overlay.
 *
 * This component owns the app-wide key bindings that aren't already claimed
 * by a specific widget (⌘K lives in the command palette). It deliberately
 * ignores keystrokes while the user is typing in an input/textarea so the
 * notes editor and search box never swallow real characters.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useEffect } from 'react';

import {
  selectHelpOpen,
  useMethodologyStore,
} from '@/features/methodology/store';

interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['⌘', 'K'], label: 'Open search palette' },
  { keys: ['/'], label: 'Open search palette' },
  { keys: ['V'], label: 'Favourites, progress & notes export' },
  { keys: ['A'], label: 'Analyze tool output' },
  { keys: ['W'], label: 'Guided triage wizard' },
  { keys: ['S'], label: 'Study mode — flashcards & quiz' },
  { keys: ['P'], label: 'Playbook — kill-chain builder' },
  { keys: ['R'], label: 'Resume — jump to next unfinished technique' },
  { keys: ['E'], label: 'Export checklist (Markdown)' },
  { keys: ['F'], label: 'Toggle canvas filters' },
  { keys: ['?'], label: 'Show this help' },
  { keys: ['Esc'], label: 'Close panel / dialog' },
];

export function ShortcutsHelp() {
  const open = useMethodologyStore(selectHelpOpen);
  const toggleHelp = useMethodologyStore((s) => s.toggleHelp);
  const closeHelp = useMethodologyStore((s) => s.closeHelp);
  const openSearch = useMethodologyStore((s) => s.openSearch);
  const toggleFilterBar = useMethodologyStore((s) => s.toggleFilterBar);
  const openAnalyzer = useMethodologyStore((s) => s.openAnalyzer);
  const openWizard = useMethodologyStore((s) => s.openWizard);
  const openStudy = useMethodologyStore((s) => s.openStudy);
  const openPlaybook = useMethodologyStore((s) => s.openPlaybook);
  const openFavorites = useMethodologyStore((s) => s.openFavorites);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Never hijack typing in a field.
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      // Ignore when a modifier is held (those are other chords, e.g. ⌘K).
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        toggleHelp();
      } else if (e.key === '/') {
        e.preventDefault();
        openSearch();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFilterBar();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        openAnalyzer();
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        openWizard();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        openStudy();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        openPlaybook();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        openFavorites();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleHelp, openSearch, toggleFilterBar, openAnalyzer, openWizard, openStudy, openPlaybook, openFavorites]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? undefined : closeHelp())}>
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
                className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-card border border-subtle bg-panel shadow-pop outline-none"
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
                  <Dialog.Title className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <Keyboard className="h-4 w-4 text-accent" />
                    Keyboard shortcuts
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      aria-label="Close"
                      className="flex h-7 w-7 items-center justify-center rounded-pill border border-hairline text-fg-secondary transition-colors hover:border-accent hover:text-accent"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Dialog.Close>
                </header>

                <Dialog.Description className="sr-only">
                  A list of keyboard shortcuts available throughout WindowsPE.
                </Dialog.Description>

                <ul className="divide-y divide-hairline px-5 py-1">
                  {SHORTCUTS.map((s) => (
                    <li
                      key={s.label + s.keys.join()}
                      className="flex items-center justify-between gap-4 py-2.5"
                    >
                      <span className="text-sm text-fg-secondary">{s.label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {s.keys.map((k) => (
                          <kbd
                            key={k}
                            className="min-w-6 rounded border border-hairline bg-elevated px-1.5 py-0.5 text-center font-mono text-[11px] text-fg"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>

                <footer className="border-t border-hairline bg-elevated/40 px-5 py-2 font-mono text-[10px] text-fg-muted">
                  progress &amp; notes are stored locally in your browser
                </footer>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
