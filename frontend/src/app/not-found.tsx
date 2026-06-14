/**
 * 404 (App Router convention file). Rendered inside the root layout, so the
 * top bar and canvas stay alive — this card simply floats above them and
 * offers a way back, matching the app's panel styling instead of Next's
 * unstyled default 404.
 */

import { Compass } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center px-6">
      <div className="pointer-events-auto max-w-md rounded-card border border-subtle bg-panel p-6 text-center shadow-pop">
        <Compass className="mx-auto h-6 w-6 text-fg-muted" aria-hidden />
        <p className="mt-3 font-mono text-xs uppercase tracking-wider text-fg-muted">
          404 — not found
        </p>
        <p className="mt-2 text-sm text-fg-secondary">
          This page doesn&rsquo;t exist. The methodology lives on the canvas —
          head back and pick a technique from there.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-pill border border-subtle bg-elevated px-4 py-1.5 text-xs text-fg transition-colors hover:border-accent hover:text-accent"
        >
          back to the methodology
        </Link>
      </div>
    </div>
  );
}
