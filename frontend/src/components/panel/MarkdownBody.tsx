'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

interface MarkdownBodyProps {
  source: string;
  className?: string;
}

/**
 * Restricted markdown renderer for `description_md` / `detection_hints`.
 *
 * We deliberately use a narrow component map (no images, no raw HTML, no
 * autolinks) so that content authors can't accidentally inject anything
 * exotic. Inline code lights up in the accent ramp via globals.css.
 */
export function MarkdownBody({ source, className }: MarkdownBodyProps) {
  return (
    <div
      className={cn(
        'text-sm leading-relaxed text-fg-secondary [&_p]:mb-3 [&_p:last-child]:mb-0',
        '[&_strong]:font-semibold [&_strong]:text-fg',
        '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-strong',
        '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul_li]:mb-1',
        '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol_li]:mb-1',
        '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-subtle [&_blockquote]:pl-3 [&_blockquote]:italic',
        // GFM tables (enabled via remark-gfm) — hairline grid that matches the
        // surrounding panel surfaces.
        '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-card [&_table]:text-xs',
        '[&_th]:border [&_th]:border-hairline [&_th]:bg-elevated [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-mono [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-fg-muted',
        '[&_td]:border [&_td]:border-hairline [&_td]:px-3 [&_td]:py-1.5 [&_td]:align-top',
        // GFM strikethrough + task-list checkboxes.
        '[&_del]:text-fg-muted [&_del]:line-through',
        '[&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:translate-y-px [&_input[type=checkbox]]:accent-accent',
        '[&_li:has(input[type=checkbox])]:list-none [&_ul:has(input[type=checkbox])]:pl-1',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Strip image tags entirely.
          img: () => null,
          // Force every link to open in a new tab + safe rel.
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
