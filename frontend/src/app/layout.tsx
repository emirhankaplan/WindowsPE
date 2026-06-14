import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

import { CommandPalette } from '@/components/layout/CommandPalette';
import { FavoritesPanel } from '@/components/layout/FavoritesPanel';
import { OutputAnalyzer } from '@/components/layout/OutputAnalyzer';
import { PlaybookBuilder } from '@/components/layout/PlaybookBuilder';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';
import { ShortcutsHelp } from '@/components/layout/ShortcutsHelp';
import { StudyMode } from '@/components/layout/StudyMode';
import { TopBar } from '@/components/layout/TopBar';
import { TriageWizard } from '@/components/layout/TriageWizard';
import { NodeDetailPanel } from '@/components/panel/NodeDetailPanel';
import { MethodologyCanvas } from '@/components/tree/MethodologyCanvas';
import { Providers } from './providers';

// Self-hosted via `next/font` — zero layout shift, no runtime request to a
// font CDN. We expose each as a CSS variable that `globals.css` consumes
// (`--font-sans` / `--font-mono`), so the design tokens stay the source of
// truth and components keep using `font-sans` / `font-mono` utilities.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'WindowsPE — Windows Privilege Escalation Methodology',
  description:
    'Interactive Windows privilege-escalation methodology for offensive-security learners. OSCP / CTF / red-team study reference.',
  applicationName: 'WindowsPE',
  authors: [{ name: 'WindowsPE' }],
  appleWebApp: { capable: true, title: 'WindowsPE', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/favicon-64.png', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

// `themeColor` lives on `viewport`, not `metadata`, in Next 15+.
export const viewport: Viewport = {
  themeColor: '#0A0B0F',
  // Allow pinch-to-zoom on mobile (user can still zoom the canvas via
  // React Flow's touch handlers; this prevents the browser from blocking it).
  userScalable: false,
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
};

/**
 * Root layout. The persistent UI (top bar, canvas, panel, command palette)
 * lives here so route changes (`/` → `/node/[id]`) never remount it.
 * Page components under this layout are tiny clients that only sync the
 * URL into the Zustand store via `useEffect`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${GeistSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <Providers>
          {/* Skip-to-content link — visible only on keyboard focus (screen readers,
              Tab navigation). Lets keyboard users jump past the top bar directly
              into the canvas without tabbing through every toolbar button. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-card focus:border focus:border-accent focus:bg-panel focus:px-4 focus:py-2 focus:text-sm focus:text-accent focus:shadow-pop"
          >
            Skip to content
          </a>
          <main
            id="main-content"
            className="relative z-10 flex h-dvh w-screen flex-col overflow-hidden"
          >
            <TopBar />
            <div className="relative flex-1">
              <MethodologyCanvas />
            </div>
            <NodeDetailPanel />
            <CommandPalette />
            <ShortcutsHelp />
            <FavoritesPanel />
            <OutputAnalyzer />
            <TriageWizard />
            <StudyMode />
            <PlaybookBuilder />
            <ServiceWorkerRegister />
            {children}
          </main>

        </Providers>
      </body>
    </html>
  );
}
