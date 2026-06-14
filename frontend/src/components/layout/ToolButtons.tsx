'use client';

import { Compass, GraduationCap, ScanSearch, Swords } from 'lucide-react';

import {
  selectPlaybookStepCount,
  useMethodologyStore,
} from '@/features/methodology/store';
import { useMounted } from '@/lib/use-mounted';

/**
 * The flagship "co-pilot" entry points in the top bar: paste-and-match
 * output analysis, the guided triage wizard, the study (flashcard + quiz)
 * mode, and the kill-chain playbook builder. Kept prominent because they are
 * what make the app a tool rather than a reference.
 */
export function ToolButtons() {
  const openAnalyzer = useMethodologyStore((s) => s.openAnalyzer);
  const openWizard = useMethodologyStore((s) => s.openWizard);
  const openStudy = useMethodologyStore((s) => s.openStudy);
  const openPlaybook = useMethodologyStore((s) => s.openPlaybook);
  // Playbooks are localStorage-persisted and hydrate synchronously on the
  // client; the server rendered this bar with no badge. Defer the count to
  // after mount so the first client render matches the server HTML.
  const mounted = useMounted();
  const persistedStepCount = useMethodologyStore(selectPlaybookStepCount);
  const stepCount = mounted ? persistedStepCount : 0;

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <button
        type="button"
        onClick={openAnalyzer}
        title="Analyze tool output — paste whoami /priv, winPEAS…"
        className="flex h-8 items-center gap-1.5 rounded-pill border border-hairline px-3 text-xs text-fg-secondary transition-colors hover:border-accent/60 hover:text-accent"
      >
        <ScanSearch className="h-3.5 w-3.5" />
        <span className="hidden font-mono uppercase tracking-wider lg:inline">analyze</span>
      </button>
      <button
        type="button"
        onClick={openWizard}
        title="Guided triage wizard"
        className="flex h-8 items-center gap-1.5 rounded-pill border border-hairline px-3 text-xs text-fg-secondary transition-colors hover:border-accent/60 hover:text-accent"
      >
        <Compass className="h-3.5 w-3.5" />
        <span className="hidden font-mono uppercase tracking-wider lg:inline">triage</span>
      </button>
      <button
        type="button"
        onClick={openStudy}
        title="Study mode — flashcards & quiz (S)"
        className="flex h-8 min-h-[44px] items-center gap-1.5 rounded-pill border border-hairline px-3 text-xs text-fg-secondary transition-colors hover:border-accent/60 hover:text-accent"
      >
        <GraduationCap className="h-3.5 w-3.5" />
        <span className="hidden font-mono uppercase tracking-wider lg:inline">study</span>
      </button>
      <button
        type="button"
        onClick={openPlaybook}
        title="Playbook — kill-chain builder (P)"
        className="relative flex h-8 min-h-[44px] items-center gap-1.5 rounded-pill border border-hairline px-3 text-xs text-fg-secondary transition-colors hover:border-accent/60 hover:text-accent"
      >
        <Swords className="h-3.5 w-3.5" />
        <span className="hidden font-mono uppercase tracking-wider lg:inline">playbook</span>
        {stepCount > 0 && (
          <span
            aria-hidden
            className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-pill bg-accent px-1 font-mono text-[9px] font-bold text-canvas"
          >
            {stepCount > 99 ? '99+' : stepCount}
          </span>
        )}
      </button>
    </div>
  );
}
