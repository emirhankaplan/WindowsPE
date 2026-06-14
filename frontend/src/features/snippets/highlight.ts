'use client';

/**
 * Shiki highlighter — singleton.
 *
 * `createHighlighter` is expensive (loads the oniguruma WASM + every grammar
 * we ask for) so we cache the in-flight promise and reuse it across every
 * SnippetBlock instance.
 */

import { createHighlighter, type Highlighter } from 'shiki';

import type { Shell } from '@/features/methodology/types';

const THEME = 'github-dark-dimmed';

/** Shiki language identifiers we load up-front (matches our `Shell` enum). */
const LANGS = ['powershell', 'bat', 'bash', 'c'] as const;

const SHELL_TO_LANG: Record<Shell, string | null> = {
  powershell: 'powershell',
  cmd: 'bat',
  bash: 'bash',
  c: 'c',
  text: null, // render as plain pre, no Shiki round-trip
};

let highlighter: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    const attempt = createHighlighter({
      themes: [THEME],
      langs: [...LANGS],
    });
    // Don't cache a *rejected* promise: if the WASM/grammar fetch fails once
    // (flaky network, captive portal, brief offline), a permanently-cached
    // rejection would disable highlighting for the rest of the session.
    // Clearing the slot lets the next SnippetBlock mount retry cleanly, while
    // callers of this attempt still see the rejection and fall back to the
    // escaped-plaintext rendering.
    attempt.catch(() => {
      if (highlighter === attempt) highlighter = null;
    });
    highlighter = attempt;
  }
  return highlighter;
}

/**
 * Highlight a snippet → HTML string. For `shell: 'text'` returns an escaped
 * `<pre>` instead of running Shiki (no point loading a grammar for prose).
 */
export async function highlightSnippet(code: string, shell: Shell): Promise<string> {
  const lang = SHELL_TO_LANG[shell];
  if (!lang) return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;

  const h = await getHighlighter();
  return h.codeToHtml(code, { lang, theme: THEME });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}
