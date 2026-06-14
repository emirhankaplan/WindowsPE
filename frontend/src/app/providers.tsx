'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session. Defaults tuned for the methodology
  // payload — content is essentially static, so stale time is generous and
  // window-focus refetch is off.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {/* `reducedMotion="user"`: when the OS-level "reduce motion" preference
          is on, Framer Motion skips transform/layout animations (the sheet
          and mobile-menu springs) while keeping opacity fades — the CSS-side
          equivalent already lives in globals.css' prefers-reduced-motion
          block, so this closes the gap for JS-driven animation. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  );
}
