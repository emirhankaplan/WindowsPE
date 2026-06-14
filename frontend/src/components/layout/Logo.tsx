import { Terminal } from 'lucide-react';

/**
 * Brand glyph. Cyan terminal mark on a tinted accent square — the same
 * accent that drives selection / hover everywhere else.
 */
export function Logo() {
  return (
    <div
      aria-hidden
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent shadow-glow"
    >
      <Terminal className="h-4 w-4" strokeWidth={2} />
    </div>
  );
}
