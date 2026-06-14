'use client';

import { Check, NotebookPen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useMethodologyStore } from '@/features/methodology/store';
import { useDebounced } from '@/lib/use-debounced';

interface NoteEditorProps {
  /** Pass as `key={nodeId}` from the parent so local state resets per node. */
  nodeId: string;
}

/**
 * Per-node scratchpad. Local state drives the textarea for snappy typing;
 * a debounced effect commits to the persisted Zustand slice (localStorage),
 * so notes survive reloads and feed the Markdown export. The "saved" tick
 * confirms the commit landed.
 */
export function NoteEditor({ nodeId }: NoteEditorProps) {
  const initial = useMethodologyStore((s) => s.notes[nodeId] ?? '');
  const setNote = useMethodologyStore((s) => s.setNote);

  const [value, setValue] = useState(initial);
  const debounced = useDebounced(value, 500);
  const [saved, setSaved] = useState(false);

  // Skip the very first commit (debounced === initial on mount) so we don't
  // flash "saved" before the user has typed anything.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setNote(nodeId, debounced);
    setSaved(true);
    const t = window.setTimeout(() => setSaved(false), 1500);
    return () => window.clearTimeout(t);
  }, [debounced, nodeId, setNote]);

  return (
    <div className="rounded-card border border-hairline bg-elevated/60 focus-within:border-accent/40">
      <div className="flex items-center justify-between border-b border-hairline px-3 py-1.5">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          <NotebookPen className="h-3 w-3" />
          your notes
        </span>
        <span
          className={`flex items-center gap-1 font-mono text-[10px] transition-opacity ${
            saved ? 'text-severity-low opacity-100' : 'opacity-0'
          }`}
        >
          <Check className="h-3 w-3" />
          saved
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Box-specific findings, working command variants, gotchas… stored locally in your browser."
        aria-label="Notes for this technique"
        spellCheck={false}
        rows={4}
        className="w-full resize-y bg-transparent px-3 py-2.5 text-sm leading-relaxed text-fg outline-none placeholder:text-fg-muted/70"
      />
    </div>
  );
}
