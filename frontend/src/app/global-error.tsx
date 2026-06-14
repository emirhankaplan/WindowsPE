'use client';

/**
 * Root error boundary (App Router convention file).
 *
 * In this app the persistent UI — top bar, React Flow canvas, every panel —
 * lives in the *root layout*, so a crash there is not caught by the
 * segment-level `error.tsx`. `global-error.tsx` is the last line of defence:
 * it replaces the root layout entirely, which also means `globals.css` is no
 * longer applied. Everything here is styled inline so the recovery screen
 * renders correctly with zero CSS dependencies.
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[windowspe] global error boundary:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0B0F',
          color: '#E6E8EE',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            border: '1px solid rgba(255,59,92,0.4)',
            borderRadius: '12px',
            backgroundColor: '#11131A',
            padding: '24px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#FF3B5C',
            }}
          >
            windowspe crashed
          </p>
          <p
            style={{
              marginTop: '12px',
              marginBottom: 0,
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#9CA3AF',
            }}
          >
            An unexpected error took down the app shell. Your checklist,
            notes and playbooks are stored locally in your browser and are
            not affected.
          </p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: 'pointer',
                borderRadius: '999px',
                border: '1px solid rgba(91,229,192,0.5)',
                backgroundColor: 'transparent',
                color: '#5BE5C0',
                padding: '6px 14px',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            >
              Reload the app
            </button>
            {/* Deliberately a plain <a>, not next/link: global-error means the
                root layout (and possibly the client router state) crashed, so
                a full-page navigation is the most reliable recovery path. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: 'inline-block',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#9CA3AF',
                padding: '6px 14px',
                fontSize: '12px',
                textDecoration: 'none',
              }}
            >
              Back to start
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
