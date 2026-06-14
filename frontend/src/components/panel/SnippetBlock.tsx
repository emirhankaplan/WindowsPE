'use client';

import {
  AlertTriangle,
  Check,
  Copy,
  FileCode2,
  Terminal,
  TerminalSquare,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { copyToClipboard } from '@/features/snippets/clipboard';
import { escapeHtml, highlightSnippet } from '@/features/snippets/highlight';
import { applyVars, hasCustomVars } from '@/features/snippets/substitute';
import { selectVars, useMethodologyStore } from '@/features/methodology/store';
import type { Shell, Snippet } from '@/features/methodology/types';
import { cn } from '@/lib/utils';

const SHELL_LABEL: Record<Shell, string> = {
  powershell: 'PowerShell',
  cmd: 'CMD',
  bash: 'Bash',
  c: 'C',
  text: 'Notes',
};

interface SnippetBlockProps {
  snippet: Snippet;
}

export function SnippetBlock({ snippet }: SnippetBlockProps) {
  const vars = useMethodologyStore(selectVars);
  // Target-context substitution makes commands copy-paste-ready. `code` is the
  // resolved text used for both display and clipboard.
  const code = applyVars(snippet.code, vars);
  const customised = hasCustomVars(vars) && code !== snippet.code;

  const [html, setHtml] = useState<string>(() =>
    // Synchronous fallback so the snippet is readable before Shiki resolves.
    `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`,
  );
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    highlightSnippet(code, snippet.shell)
      .then((rendered) => {
        if (!cancelled) setHtml(rendered);
      })
      .catch(() => {
        // Shiki failed to initialise (WASM load error, network, etc.).
        // The synchronous fallback HTML set in useState() stays in place —
        // the snippet remains readable as escaped plain text.
      });
    return () => {
      cancelled = true;
    };
  }, [code, snippet.shell]);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(code);
    if (!ok) return;
    setCopied(true);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-elevated">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <ShellIcon shell={snippet.shell} />
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
            {SHELL_LABEL[snippet.shell]}
          </span>
          <span aria-hidden className="text-fg-muted">·</span>
          <span className="truncate text-xs text-fg-secondary">{snippet.title}</span>
          {snippet.requires_admin && (
            <span
              title="Requires an already-elevated context"
              className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-pill border border-severity-high/40 bg-severity-high/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-severity-high"
            >
              <AlertTriangle className="h-3 w-3" />
              admin
            </span>
          )}
          {customised && (
            <span
              title="Your target context has been substituted into this command"
              className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-pill border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent"
            >
              vars
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy snippet to clipboard'}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors',
            copied
              ? 'border-severity-low/40 text-severity-low'
              : 'border-hairline text-fg-secondary hover:border-accent hover:text-accent',
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </header>

      <div
        // Shiki emits `<pre class="shiki" style="background:...">` — we want
        // the parent surface, not Shiki's, so we strip the background via
        // arbitrary variants and let our container show through.
        className="overflow-x-auto px-3 py-3 text-[13px] leading-relaxed [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:font-mono [&_code]:!font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {snippet.description && (
        <footer className="border-t border-hairline bg-panel/40 px-3 py-2 text-xs text-fg-secondary">
          {snippet.description}
        </footer>
      )}
    </div>
  );
}

function ShellIcon({ shell }: { shell: Shell }) {
  const common = 'h-3.5 w-3.5 shrink-0';
  switch (shell) {
    case 'powershell':
      return <TerminalSquare className={cn(common, 'text-accent-alt')} />;
    case 'cmd':
      return <Terminal className={cn(common, 'text-accent')} />;
    case 'bash':
      return <Terminal className={cn(common, 'text-severity-medium')} />;
    case 'c':
      return <FileCode2 className={cn(common, 'text-severity-info')} />;
    case 'text':
    default:
      return <FileCode2 className={cn(common, 'text-fg-muted')} />;
  }
}
