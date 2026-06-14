'use client';

import { Check, Download } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useTree } from '@/features/methodology/hooks';
import { buildMarkdownReport, downloadTextFile } from '@/features/methodology/export';
import { useMethodologyStore } from '@/features/methodology/store';

/**
 * Exports the user's progress + notes as a Markdown checklist. Wired both to
 * a top-bar button and the global `E` shortcut. Disabled until the tree has
 * loaded (nothing to export against otherwise).
 */
export function ExportButton() {
  const { data: tree } = useTree();
  const [done, setDone] = useState(false);

  const handleExport = useCallback(() => {
    if (!tree) return;
    // Pull the persisted slice imperatively — no need to subscribe/re-render
    // this button on every keystroke in the notes editor.
    const { progress, notes } = useMethodologyStore.getState();
    const md = buildMarkdownReport({ tree, progress, notes });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`windowspe-checklist-${stamp}.md`, md);
    setDone(true);
    window.setTimeout(() => setDone(false), 1500);
  }, [tree]);

  // Global `E` shortcut (ignored while typing in a field / holding a modifier).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      handleExport();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleExport]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!tree}
      aria-label="Export progress and notes as Markdown (E)"
      title="Export checklist (E)"
      className="hidden h-8 items-center gap-1.5 rounded-pill border border-hairline px-3 text-xs text-fg-secondary transition-colors hover:border-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
    >
      {done ? (
        <Check className="h-3.5 w-3.5 text-severity-low" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      <span className="hidden md:inline">{done ? 'exported' : 'export'}</span>
    </button>
  );
}
