'use client';

import type { Difficulty, Severity } from '@/features/methodology/types';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      role="img"
      aria-label={`${severity} severity`}
      className={cn(
        'inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]',
        className,
      )}
      style={{
        color: `var(--color-severity-${severity})`,
        borderColor: `color-mix(in srgb, var(--color-severity-${severity}) 45%, transparent)`,
        backgroundColor: `color-mix(in srgb, var(--color-severity-${severity}) 12%, transparent)`,
      }}
    >
      {severity}
    </span>
  );
}

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  className?: string;
}

const DIFFICULTY_TOKEN: Record<Difficulty, string> = {
  'oscp-basic': 'basic',
  'oscp-advanced': 'advanced',
  'red-team': 'red',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  'oscp-basic': 'OSCP basic',
  'oscp-advanced': 'OSCP advanced',
  'red-team': 'red team',
};

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const token = DIFFICULTY_TOKEN[difficulty];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]',
        className,
      )}
      style={{
        color: `var(--color-difficulty-${token})`,
        borderColor: `color-mix(in srgb, var(--color-difficulty-${token}) 45%, transparent)`,
        backgroundColor: `color-mix(in srgb, var(--color-difficulty-${token}) 10%, transparent)`,
      }}
    >
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}
