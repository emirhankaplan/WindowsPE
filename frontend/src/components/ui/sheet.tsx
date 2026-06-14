'use client';

/**
 * Side sheet built on Radix Dialog + Framer Motion.
 *
 * Radix handles focus trap, escape-to-close, scroll lock, and aria
 * plumbing. Framer Motion gives us the slide-in spring without fighting
 * Radix's mount/unmount lifecycle (we render through Portal/forceMount and
 * orchestrate exit animations with AnimatePresence).
 *
 * Animation strategy: we detect the md breakpoint (≥768 px) with a
 * `matchMedia` call so Framer Motion slides on the correct axis — Y on mobile
 * (bottom sheet) and X on desktop (side panel). A single spring config covers
 * both axes; only the target axis is non-zero.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title — required by Radix; hidden visually if `titleVisuallyHidden`. */
  title: string;
  titleVisuallyHidden?: boolean;
  description?: string;
  side?: 'right' | 'left';
  className?: string;
  children: React.ReactNode;
}

/** Returns true when the viewport is at or above Tailwind's `md` breakpoint. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  titleVisuallyHidden = true,
  description,
  side = 'right',
  className,
  children,
}: SheetProps) {
  const isDesktop = useIsDesktop();

  // On desktop the panel slides in horizontally from the chosen side.
  // On mobile it slides up from the bottom (bottom-sheet pattern).
  const hiddenState = isDesktop
    ? { x: side === 'right' ? '100%' : '-100%', y: 0 }
    : { y: '100%', x: 0 };
  const visibleState = { x: 0, y: 0 };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-canvas/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount>
              <motion.aside
                className={cn(
                  // Mobile: full-width bottom sheet occupying ~90% viewport height
                  // Desktop (md+): side panel from right/left
                  'fixed z-50 flex flex-col border-subtle bg-panel shadow-pop outline-none',
                  // Mobile layout: bottom sheet
                  'bottom-0 left-0 right-0 max-h-[90dvh] rounded-t-[20px] border-t',
                  // Desktop layout: full-height side panel
                  'md:bottom-auto md:top-0 md:max-h-none md:h-dvh md:w-full md:max-w-2xl md:rounded-none',
                  side === 'right'
                    ? 'md:right-0 md:left-auto md:border-t-0 md:border-l'
                    : 'md:left-0 md:right-auto md:border-t-0 md:border-r',
                  className,
                )}
                initial={hiddenState}
                animate={visibleState}
                exit={hiddenState}
                transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              >
                {/* Mobile drag handle */}
                <div className="flex justify-center pt-3 pb-1 md:hidden">
                  <div className="h-1 w-10 rounded-full bg-emphasis" />
                </div>

                {titleVisuallyHidden ? (
                  <VisuallyHidden>
                    <Dialog.Title>{title}</Dialog.Title>
                    {description && <Dialog.Description>{description}</Dialog.Description>}
                  </VisuallyHidden>
                ) : (
                  <header className="border-b border-hairline px-6 py-4">
                    <Dialog.Title className="text-lg font-semibold text-fg">{title}</Dialog.Title>
                    {description && (
                      <Dialog.Description className="mt-1 text-sm text-fg-secondary">
                        {description}
                      </Dialog.Description>
                    )}
                  </header>
                )}

                <Dialog.Close asChild>
                  <button
                    aria-label="Close panel"
                    className="absolute right-4 top-3 z-10 flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-pill border border-hairline bg-panel/80 text-fg-secondary backdrop-blur-sm transition-colors hover:border-accent hover:text-accent md:top-4 md:h-8 md:w-8 md:min-h-0 md:min-w-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>

                {/* Scrollable content area */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                  {children}
                </div>
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
