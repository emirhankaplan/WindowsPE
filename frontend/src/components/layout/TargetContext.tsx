'use client';

import { Crosshair, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_VARS,
  selectVars,
  useMethodologyStore,
  type TargetVars,
} from '@/features/methodology/store';
import { hasCustomVars } from '@/features/snippets/substitute';
import { useMounted } from '@/lib/use-mounted';
import { cn } from '@/lib/utils';

const FIELDS: { key: keyof TargetVars; label: string; placeholder: string }[] = [
  { key: 'lhost', label: 'LHOST', placeholder: DEFAULT_VARS.lhost },
  { key: 'lport', label: 'LPORT', placeholder: DEFAULT_VARS.lport },
  { key: 'targetIp', label: 'Target IP', placeholder: DEFAULT_VARS.targetIp },
  { key: 'domain', label: 'Domain', placeholder: DEFAULT_VARS.domain },
  { key: 'workdir', label: 'Work dir', placeholder: DEFAULT_VARS.workdir },
  { key: 'payload', label: 'Payload', placeholder: DEFAULT_VARS.payload },
];

/**
 * Target-context editor. Setting LHOST / LPORT / target / paths here rewrites
 * the placeholders inside every snippet so commands are copy-paste-ready —
 * the single biggest "tool, not reference" feature. Values persist locally.
 */
export function TargetContext() {
  const [open, setOpen] = useState(false);
  const vars = useMethodologyStore(selectVars);
  const setVar = useMethodologyStore((s) => s.setVar);
  const resetVars = useMethodologyStore((s) => s.resetVars);
  // Vars are localStorage-persisted and hydrate synchronously on the client,
  // but the server rendered this trigger from the defaults ("target", muted
  // styling). Treat the context as inactive until after mount so the first
  // client render matches the server HTML — the customised label/accent
  // appears one paint later instead of causing a hydration mismatch.
  const mounted = useMounted();
  const active = mounted && hasCustomVars(vars);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Target context (LHOST/LPORT/…)"
        title="Target context — substitute LHOST/LPORT/target into commands"
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-pill border px-3 text-xs transition-colors',
          active
            ? 'border-accent/60 bg-accent/10 text-accent'
            : 'border-hairline text-fg-secondary hover:border-subtle hover:text-fg',
        )}
      >
        <Crosshair className="h-3.5 w-3.5" />
        <span className="hidden font-mono uppercase tracking-wider sm:inline">
          {active ? vars.lhost : 'target'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-card border border-subtle bg-panel/95 p-4 shadow-pop backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
              Target context
            </p>
            {active && (
              <button
                type="button"
                onClick={resetVars}
                className="inline-flex items-center gap-1 font-mono text-[10px] text-fg-muted transition-colors hover:text-severity-critical"
              >
                <RotateCcw className="h-3 w-3" />
                reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-fg-muted">
                  {f.label}
                </span>
                <input
                  value={vars[f.key]}
                  onChange={(e) => setVar(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full rounded-input border border-hairline bg-elevated px-2 py-1 font-mono text-xs text-fg outline-none transition-colors focus:border-accent/50"
                />
              </label>
            ))}
          </div>

          <p className="mt-3 font-mono text-[10px] leading-relaxed text-fg-muted">
            Substituted into every snippet (and exports) so commands are
            ready to paste. Stored locally.
          </p>
        </div>
      )}
    </div>
  );
}
