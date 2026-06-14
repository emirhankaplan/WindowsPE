'use client';

/**
 * Default route. The visible UI is owned by the root layout; this page only
 * exists to clear the selected node when the user navigates back to `/`.
 */

import { useEffect } from 'react';

import { useMethodologyStore } from '@/features/methodology/store';

export default function HomePage() {
  const selectNode = useMethodologyStore((s) => s.selectNode);

  useEffect(() => {
    selectNode(null);
  }, [selectNode]);

  return null;
}
