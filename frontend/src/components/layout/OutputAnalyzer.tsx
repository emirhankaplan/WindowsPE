'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ScanSearch, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { SeverityBadge } from '@/components/panel/SeverityBadge';
import { useTree } from '@/features/methodology/hooks';
import { analyzeOutput, buildMatchIndex } from '@/features/methodology/match';
import {
  selectAnalyzerOpen,
  useMethodologyStore,
} from '@/features/methodology/store';
import { useDebounced } from '@/lib/use-debounced';

const SAMPLE = `Paste output from: whoami /priv, winPEAS, PowerUp, accesschk…

Example:
PRIVILEGES INFORMATION
----------------------
SeImpersonatePrivilege        Impersonate a client    Enabled
SeBackupPrivilege             Back up files           Disabled`;

/**
 * Output analyzer — paste real tool output (whoami /priv, winPEAS, …) and get
 * the applicable techniques ranked. The differentiator that turns the site
 * from a reference into an exploitation co-pilot.
 */
export function OutputAnalyzer() {
  const open = useMethodologyStore(selectAnalyzerOpen);
  const close = useMethodologyStore((s) => s.closeAnalyzer);
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const router = useRouter();
  const { data: tree } = useTree();

  const [text, setText] = useState('');
  const debounced = useDebounced(text, 250);

  const index = useMemo(() => (tree ? buildMatchIndex(tree) : []), [tree]);
  const validIds = useMemo(
    () => new Set(tree?.nodes.map((n) => n.id) ?? []),
    [tree],
  );
  const matches = useMemo(
    () => analyzeOutput(debounced, index, validIds),
    [debounced, index, validIds],
  );

  const go = (id: string) => {
    close();
    selectNode(id);
    router.push(`/node/${encodeURIComponent(id)}`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? undefined : close())}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-canvas/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 flex-col overflow-hidden rounded-card border border-subtle bg-panel shadow-pop outline-none"
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
                  <Dialog.Title className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <ScanSearch className="h-4 w-4 text-accent" />
                    Analyze tool output
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
                  Paste tool output to get ranked applicable privilege-escalation techniques.
                </Dialog.Description>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-2">
                  {/* Input */}
                  <div className="border-b border-hairline p-3 md:border-b-0 md:border-r">
                    <textarea
                      autoFocus
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={SAMPLE}
                      spellCheck={false}
                      className="h-48 w-full resize-none rounded-input border border-hairline bg-elevated p-3 font-mono text-xs leading-relaxed text-fg outline-none placeholder:text-fg-muted/60 focus:border-accent/50 md:h-[58vh]"
                    />
                  </div>

                  {/* Results */}
                  <div className="min-h-0 overflow-y-auto p-3">
                    {debounced.trim().length < 3 ? (
                      <p className="px-2 py-8 text-center text-sm text-fg-muted">
                        Matches appear here as you paste.
                      </p>
                    ) : matches.length === 0 ? (
                      <p className="px-2 py-8 text-center text-sm text-fg-muted">
                        No techniques matched. Try pasting more context
                        (privilege names, service names, file paths).
                      </p>
                    ) : (
                      <>
                        <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                          {matches.length} applicable technique{matches.length === 1 ? '' : 's'}
                        </p>
                        <ul className="space-y-1.5">
                          {matches.map((m) => (
                            <li key={m.node.id}>
                              <button
                                type="button"
                                onClick={() => go(m.node.id)}
                                className="group flex w-full items-start gap-2.5 rounded-input border border-hairline bg-elevated/50 px-3 py-2 text-left transition-colors hover:border-accent/40 hover:bg-elevated"
                              >
                                <SeverityBadge severity={m.node.severity} className="mt-0.5 shrink-0" />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1.5">
                                    <span className="truncate text-sm font-medium text-fg group-hover:text-accent">
                                      {m.node.title}
                                    </span>
                                    <ArrowRight className="h-3 w-3 shrink-0 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" />
                                  </span>
                                  <span className="mt-1 flex flex-wrap gap-1">
                                    {m.reasons.map((r) => (
                                      <span
                                        key={r}
                                        className="rounded-pill border border-hairline px-1.5 py-px font-mono text-[9px] text-fg-muted"
                                      >
                                        {r}
                                      </span>
                                    ))}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
