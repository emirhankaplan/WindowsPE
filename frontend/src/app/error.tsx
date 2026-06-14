'use client';

/**
 * Route-segment error boundary (App Router convention file).
 *
 * Catches render/runtime errors thrown by page components under the root
 * layout so a single broken render degrades to an inline recovery card
 * instead of unmounting the whole app to a blank screen. The persistent
 * shell (top bar, canvas) lives in the root layout and keeps working —
 * errors thrown *there* are handled by `global-error.tsx`.
 */

import { RotateCcw, ServerCrash } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging — there is no remote reporter in this
    // app, so the console is the observability channel.
    console.error('[windowspe] route error boundary:', error);
  }, [error]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center px-6">
      <div className="pointer-events-auto max-w-md rounded-card border border-severity-critical/40 bg-panel p-6 shadow-pop">
        <div className="flex items-center gap-2 text-severity-critical">
          <ServerCrash className="h-4 w-4" />
          <span className="font-mono text-xs uppercase tracking-wider">
            something went wrong
          </span>
        </div>
        <p className="mt-2 text-sm text-fg-secondary">
          This view hit an unexpected error. Your progress and notes are safe —
          they are stored locally in your browser.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-pill border border-subtle bg-elevated px-3 py-1 text-xs text-fg transition-colors hover:border-accent hover:text-accent"
          >
            <RotateCcw className="h-3 w-3" />
            try again
          </button>
          <Link
            href="/"
            className="rounded-pill border border-hairline px-3 py-1 text-xs text-fg-secondary transition-colors hover:border-accent hover:text-accent"
          >
            back to start
          </Link>
        </div>
      </div>
    </div>
  );
}
