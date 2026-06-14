import Link from 'next/link';

import { ExportButton } from './ExportButton';
import { FavoritesButton } from './FavoritesButton';
import { GridToggle } from './GridToggle';
import { HelpButton } from './HelpButton';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { ProgressTracker } from './ProgressTracker';
import { SearchTrigger } from './SearchTrigger';
import { TargetContext } from './TargetContext';
import { ToolButtons } from './ToolButtons';

/**
 * Persistent application top bar. Lives in the root layout so it survives
 * route changes. Background is a translucent panel with backdrop blur so
 * the canvas content scrolls under it cleanly.
 *
 * On mobile (<md) most tool buttons are hidden — accessible via MobileMenu
 * (hamburger → bottom-sheet drawer). Search and the logo always show.
 */
export function TopBar() {
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-panel/85 px-3 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <Logo />
        <div className="flex items-baseline gap-2 sm:gap-3">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-fg transition-colors hover:text-accent"
          >
            WindowsPE
          </Link>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted sm:inline">
            priv esc methodology
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Desktop-only: progress tracker */}
        <ProgressTracker />

        {/* Desktop-only: analyze + triage */}
        <ToolButtons />

        {/* Desktop-only: target context + export + grid toggle + help */}
        <div className="hidden items-center gap-2 sm:flex sm:gap-3">
          <TargetContext />
          <FavoritesButton />
          <ExportButton />
          <GridToggle />
          <HelpButton />
        </div>

        {/* Search — always visible (mobile has icon-only variant) */}
        <SearchTrigger />

        {/* Mobile hamburger — visible only below md breakpoint */}
        <MobileMenu />
      </div>
    </header>
  );
}
