'use client';

/**
 * ⌘K / Ctrl+K command palette.
 *
 * cmdk owns the keyboard nav + filtering primitives; Radix Dialog owns the
 * focus trap, escape handling, and portal; Framer Motion drives the
 * enter/exit animation. The actual hit list comes from the backend FTS5
 * endpoint via `useSearch`, debounced 200ms.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  Compass,
  Crosshair,
  Download,
  Filter,
  GraduationCap,
  History,
  Keyboard,
  Loader2,
  RotateCcw,
  ScanSearch,
  Search,
  SearchX,
  Share2,
  Star,
  Swords,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { SeverityBadge } from '@/components/panel/SeverityBadge';
import { buildMarkdownReport, downloadTextFile } from '@/features/methodology/export';
import { useSearch, useTree } from '@/features/methodology/hooks';
import {
  selectRecentIds,
  selectSearchHistory,
  selectSearchOpen,
  useMethodologyStore,
} from '@/features/methodology/store';
import { useDebounced } from '@/lib/use-debounced';
import { cn } from '@/lib/utils';

export function CommandPalette() {
  const open = useMethodologyStore(selectSearchOpen);
  const openSearch = useMethodologyStore((s) => s.openSearch);
  const closeSearch = useMethodologyStore((s) => s.closeSearch);
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const pushSearchHistory = useMethodologyStore((s) => s.pushSearchHistory);
  const removeSearchHistory = useMethodologyStore((s) => s.removeSearchHistory);
  const clearSearchHistory = useMethodologyStore((s) => s.clearSearchHistory);
  const router = useRouter();

  const { data: tree } = useTree();
  const totalNodes = tree?.nodes.length ?? 0;

  // Resolve the persisted recent-id list into displayable node summaries,
  // dropping any ids that no longer exist in the tree.
  const recentIds = useMethodologyStore(selectRecentIds);
  const recentNodes = useMemo(() => {
    if (!tree) return [];
    const byId = new Map(tree.nodes.map((n) => [n.id, n]));
    return recentIds
      .map((id) => byId.get(id))
      .filter((n): n is NonNullable<typeof n> => n != null);
  }, [tree, recentIds]);

  // Persisted search history (most recent first)
  const searchHistory = useMethodologyStore(selectSearchHistory);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 200);
  const { data, isFetching, isError } = useSearch(debouncedQuery, 20);

  // Global keyboard shortcut. Toggle on ⌘K / Ctrl+K, ignore when the
  // chord is intercepted by a native input the user is already typing in.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) closeSearch();
        else openSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, openSearch, closeSearch]);

  // Reset the query whenever the palette closes so the next open is clean.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const handleSelect = (nodeId: string, fromQuery?: string) => {
    // Save the query that led to this selection so it appears in search history.
    if (fromQuery && fromQuery.trim().length >= 2) {
      pushSearchHistory(fromQuery.trim());
    }
    closeSearch();
    // Optimistic store update so the detail panel opens on this tick rather
    // than waiting for the route change to settle (matches the canvas /
    // cross-link navigation behaviour).
    selectNode(nodeId);
    router.push(`/node/${encodeURIComponent(nodeId)}`);
  };

  // Re-run a historic query by injecting it back into the search input.
  const handleHistorySelect = (q: string) => {
    setQuery(q);
  };

  // Quick actions — surfaced in the idle palette so power users can drive the
  // app from the keyboard without hunting for buttons. Each reads the store
  // imperatively at run time, so this list never needs to re-subscribe.
  const actions: { id: string; label: string; icon: LucideIcon; run: () => void }[] = [
    {
      id: 'favorites',
      label: 'View favourites, progress & notes export (V)',
      icon: Star,
      run: () => useMethodologyStore.getState().openFavorites(),
    },
    {
      id: 'analyze',
      label: 'Analyze tool output (whoami /priv, winPEAS…)',
      icon: ScanSearch,
      run: () => useMethodologyStore.getState().openAnalyzer(),
    },
    {
      id: 'wizard',
      label: 'Guided triage wizard',
      icon: Compass,
      run: () => useMethodologyStore.getState().openWizard(),
    },
    {
      id: 'study',
      label: 'Study mode — flashcards & quiz (S)',
      icon: GraduationCap,
      run: () => useMethodologyStore.getState().openStudy(),
    },
    {
      id: 'playbook',
      label: 'Playbook — kill-chain builder (P)',
      icon: Swords,
      run: () => useMethodologyStore.getState().openPlaybook(),
    },
    {
      id: 'export',
      label: 'Export checklist (Markdown)',
      icon: Download,
      run: () => {
        if (!tree) return;
        const { progress, notes } = useMethodologyStore.getState();
        const md = buildMarkdownReport({ tree, progress, notes });
        downloadTextFile(`windowspe-checklist-${new Date().toISOString().slice(0, 10)}.md`, md);
      },
    },
    {
      id: 'filters',
      label: 'Toggle canvas filters',
      icon: Filter,
      run: () => useMethodologyStore.getState().toggleFilterBar(),
    },
    {
      id: 'links',
      label: 'Toggle relationship overlay',
      icon: Share2,
      run: () => useMethodologyStore.getState().toggleShowLinks(),
    },
    {
      id: 'focus',
      label: 'Toggle focus mode',
      icon: Crosshair,
      run: () => useMethodologyStore.getState().toggleFocusMode(),
    },
    {
      id: 'shortcuts',
      label: 'Show keyboard shortcuts',
      icon: Keyboard,
      run: () => useMethodologyStore.getState().openHelp(),
    },
    {
      id: 'reset',
      label: 'Reset all progress',
      icon: RotateCcw,
      run: () => {
        if (window.confirm('Reset all progress? Your notes are kept.')) {
          useMethodologyStore.getState().resetProgress();
        }
      },
    },
  ];

  const runAction = (run: () => void) => {
    closeSearch();
    // Defer so the palette's close animation isn't blocked by a sync
    // window.confirm / download in the same tick.
    window.setTimeout(run, 0);
  };

  const showFetching = isFetching && debouncedQuery.length >= 2;
  const showIdle = debouncedQuery.length < 2;
  const showEmpty =
    !showIdle && !isFetching && (data?.hits.length ?? 0) === 0 && !isError;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => (o ? openSearch() : closeSearch())}
    >
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
                className="fixed left-1/2 top-[18vh] z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-card border border-subtle bg-panel shadow-pop outline-none"
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <VisuallyHidden>
                  <Dialog.Title>Search techniques</Dialog.Title>
                  <Dialog.Description>
                    Type to search across {totalNodes} nodes — press Enter to
                    open one.
                  </Dialog.Description>
                </VisuallyHidden>

                <Command label="Search techniques" shouldFilter={false}>
                  {/* Input row */}
                  <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
                    <Search className="h-4 w-4 shrink-0 text-fg-muted" />
                    <Command.Input
                      autoFocus
                      placeholder="Search techniques, snippets, tags…"
                      value={query}
                      onValueChange={setQuery}
                      className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
                    />
                    {showFetching && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />
                    )}
                    <kbd className="hidden rounded border border-hairline bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-fg-muted sm:inline">
                      esc
                    </kbd>
                  </div>

                  {/* Results */}
                  <Command.List className="max-h-[400px] overflow-y-auto p-1">
                    {showIdle && recentNodes.length > 0 && (
                      <Command.Group
                        heading="Recent"
                        className="[&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:gap-1.5 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em] [&_[cmdk-group-heading]]:text-fg-muted"
                      >
                        {recentNodes.map((n) => (
                          <Command.Item
                            key={n.id}
                            value={`recent ${n.id} ${n.title}`}
                            onSelect={() => handleSelect(n.id)}
                            className={cn(
                              'group flex w-full cursor-pointer items-center gap-3 rounded-input px-3 py-2 text-sm transition-colors',
                              'data-[selected=true]:bg-elevated',
                            )}
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
                            <SeverityBadge severity={n.severity} className="shrink-0" />
                            <span className="min-w-0 flex-1 truncate text-sm text-fg">
                              {n.title}
                            </span>
                            <span className="hidden font-mono text-[10px] text-fg-muted group-data-[selected=true]:text-accent sm:inline">
                              {n.phase_id}
                            </span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    {showIdle && searchHistory.length > 0 && (
                      <Command.Group
                        heading="Search history"
                        className="[&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:justify-between [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em] [&_[cmdk-group-heading]]:text-fg-muted"
                      >
                        {searchHistory.slice(0, 8).map((q) => (
                          <Command.Item
                            key={q}
                            value={`history ${q}`}
                            onSelect={() => handleHistorySelect(q)}
                            className={cn(
                              'group flex w-full cursor-pointer items-center gap-3 rounded-input px-3 py-2 text-sm transition-colors',
                              'data-[selected=true]:bg-elevated',
                            )}
                          >
                            <History className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
                            <span className="min-w-0 flex-1 truncate font-mono text-sm text-fg-secondary group-data-[selected=true]:text-fg">
                              {q}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSearchHistory(q);
                              }}
                              aria-label={`Remove "${q}" from search history`}
                              className="invisible rounded p-0.5 text-fg-muted transition-colors hover:text-severity-critical group-hover:visible"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Command.Item>
                        ))}
                        {searchHistory.length > 0 && (
                          <Command.Item
                            value="clear-history"
                            onSelect={() => {
                              if (window.confirm('Clear all search history?')) {
                                clearSearchHistory();
                              }
                            }}
                            className={cn(
                              'group flex w-full cursor-pointer items-center gap-2 rounded-input px-3 py-1.5 font-mono text-[10px] text-fg-muted transition-colors',
                              'data-[selected=true]:bg-elevated data-[selected=true]:text-fg',
                            )}
                          >
                            <Trash2 className="h-3 w-3" />
                            clear search history
                          </Command.Item>
                        )}
                      </Command.Group>
                    )}

                    {showIdle && recentNodes.length === 0 && (
                      <IdleHint totalNodes={totalNodes} />
                    )}

                    {showIdle && (
                      <Command.Group
                        heading="Actions"
                        className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em] [&_[cmdk-group-heading]]:text-fg-muted"
                      >
                        {actions.map((a) => {
                          const Icon = a.icon;
                          return (
                            <Command.Item
                              key={a.id}
                              value={`action ${a.id} ${a.label}`}
                              onSelect={() => runAction(a.run)}
                              className={cn(
                                'group flex w-full cursor-pointer items-center gap-3 rounded-input px-3 py-2 text-sm transition-colors',
                                'data-[selected=true]:bg-elevated',
                              )}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 text-fg-muted group-data-[selected=true]:text-accent" />
                              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                                {a.label}
                              </span>
                            </Command.Item>
                          );
                        })}
                      </Command.Group>
                    )}

                    {showEmpty && (
                      <Command.Empty>
                        <EmptyState query={debouncedQuery} />
                      </Command.Empty>
                    )}

                    {isError && (
                      <div className="px-4 py-6 text-center text-sm text-severity-critical">
                        Search failed. Is the backend running?
                      </div>
                    )}

                    {(data?.hits.length ?? 0) > 0 && (
                      <Command.Group
                        heading="Techniques"
                        className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em] [&_[cmdk-group-heading]]:text-fg-muted"
                      >
                        {data!.hits.map((hit) => (
                          <Command.Item
                            key={hit.node_id}
                            value={`${hit.node_id} ${hit.title}`}
                            onSelect={() => handleSelect(hit.node_id, debouncedQuery)}
                            className={cn(
                              'group flex w-full cursor-pointer items-center gap-3 rounded-input px-3 py-2 text-sm transition-colors',
                              'data-[selected=true]:bg-elevated',
                            )}
                          >
                            <SeverityBadge
                              severity={hit.severity}
                              className="shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-fg">
                                {hit.title}
                              </div>
                              <div
                                className="mt-0.5 line-clamp-1 text-xs text-fg-secondary [&_mark]:bg-accent-dim [&_mark]:px-0.5 [&_mark]:text-accent"
                              >
                                <SnippetHighlight text={hit.snippet} />
                              </div>
                            </div>
                            <span className="hidden font-mono text-[10px] text-fg-muted group-data-[selected=true]:text-accent sm:inline">
                              {hit.phase_id}
                            </span>
                            <ArrowRight className="h-3 w-3 shrink-0 text-fg-muted opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                  </Command.List>

                  {/* Footer hints */}
                  <footer className="flex items-center gap-4 border-t border-hairline bg-elevated/40 px-3 py-2 font-mono text-[10px] text-fg-muted">
                    <span>
                      <kbd className="mr-1 rounded border border-hairline bg-panel px-1 py-px">
                        ↑↓
                      </kbd>
                      navigate
                    </span>
                    <span>
                      <kbd className="mr-1 rounded border border-hairline bg-panel px-1 py-px">
                        ↵
                      </kbd>
                      open
                    </span>
                    <span className="ml-auto">FTS5 · {totalNodes} nodes</span>
                  </footer>
                </Command>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function IdleHint({ totalNodes }: { totalNodes: number }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Search className="h-6 w-6 text-fg-muted" />
      <p className="text-sm text-fg-secondary">
        Search across{' '}
        <span className="font-medium text-accent">{totalNodes}</span> techniques,
        commands, and tags.
      </p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        try: <span className="text-accent">unquoted</span>,{' '}
        <span className="text-accent">SeImpersonate</span>,{' '}
        <span className="text-accent">printnightmare</span>
      </p>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <SearchX className="h-6 w-6 text-fg-muted" />
      <p className="text-sm text-fg-secondary">
        No techniques match{' '}
        <span className="font-mono text-fg">&ldquo;{query}&rdquo;</span>.
      </p>
    </div>
  );
}

/**
 * Safely render an FTS5 snippet that may contain `<mark>...</mark>` highlight
 * markers. Instead of `dangerouslySetInnerHTML`, we split the string on those
 * tags and emit proper React elements — no raw HTML ever reaches the DOM.
 *
 * The backend already sanitizes snippets (only `<mark>` tags pass through),
 * but this component provides defense-in-depth: even if an unexpected HTML tag
 * slips through it will be rendered as escaped text, not executed markup.
 */
function SnippetHighlight({ text }: { text: string }) {
  // Split on <mark> and </mark> boundaries.
  // Odd-indexed segments (between opening and closing tags) are highlighted.
  const parts = text.split(/(<mark>|<\/mark>)/);
  const nodes: ReactNode[] = [];
  let insideMark = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === '<mark>') {
      insideMark = true;
    } else if (part === '</mark>') {
      insideMark = false;
    } else if (part) {
      // Plain text — React will escape it automatically.
      if (insideMark) {
        nodes.push(<mark key={i}>{part}</mark>);
      } else {
        nodes.push(part);
      }
    }
  }

  return <>{nodes}</>;
}
