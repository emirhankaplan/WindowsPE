'use client';

import {
  BookOpen,
  ExternalLink,
  FileText,
  Library,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { Reference, RefKind } from '@/features/methodology/types';

const KIND_ICON: Record<RefKind, LucideIcon> = {
  mitre: ShieldCheck,
  hacktricks: Library,
  msdoc: BookOpen,
  cve: ShieldCheck,
  blog: FileText,
  tool: Wrench,
  paper: BookOpen,
};

const KIND_LABEL: Record<RefKind, string> = {
  mitre: 'MITRE',
  hacktricks: 'HackTricks',
  msdoc: 'MS Docs',
  cve: 'CVE',
  blog: 'Blog',
  tool: 'Tool',
  paper: 'Paper',
};

const KIND_COLOR: Record<RefKind, string> = {
  mitre: 'var(--color-accent-alt)',
  hacktricks: 'var(--color-accent)',
  msdoc: 'var(--color-severity-info)',
  cve: 'var(--color-severity-critical)',
  blog: 'var(--color-fg-secondary)',
  tool: 'var(--color-severity-medium)',
  paper: 'var(--color-fg-secondary)',
};

interface ReferenceListProps {
  references: Reference[];
}

export function ReferenceList({ references }: ReferenceListProps) {
  if (references.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {references.map((ref, idx) => {
        const Icon = KIND_ICON[ref.kind];
        return (
          <li key={`${ref.url}-${idx}`}>
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-card border border-hairline bg-elevated/60 px-3 py-2 transition-colors hover:border-subtle hover:bg-elevated"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-hairline"
                style={{ color: KIND_COLOR[ref.kind] }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-fg group-hover:text-fg">{ref.title}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                  {KIND_LABEL[ref.kind]}
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-fg-muted transition-colors group-hover:text-accent" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
