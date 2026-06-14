'use client';

/**
 * `/node/:id` — deep-linkable view of a single technique.
 *
 * The visible UI lives in the root layout; this page just mirrors the URL
 * param into the Zustand store so the canvas highlights the right node
 * and the side panel opens. Click-driven navigation also passes through
 * here (the canvas calls `router.push` after optimistically calling
 * `selectNode`), so this effect is a no-op in that case.
 */

import { useParams } from 'next/navigation';
import { useEffect } from 'react';

import { useMethodologyStore } from '@/features/methodology/store';

export default function NodePage() {
  const params = useParams<{ id: string }>();
  const selectNode = useMethodologyStore((s) => s.selectNode);

  useEffect(() => {
    if (params?.id) selectNode(params.id);
  }, [params?.id, selectNode]);

  return null;
}
