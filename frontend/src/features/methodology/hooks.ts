'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { api, ApiClientError } from '@/lib/api-client';
import type {
  Methodology,
  NodeDetail,
  SearchResponse,
} from './types';

/**
 * Full methodology graph. Backend ETag + Cache-Control make this cheap to
 * refetch, but content effectively never changes within a session, so we
 * lean on a long staleTime.
 */
export function useTree(
  options?: Partial<UseQueryOptions<Methodology, ApiClientError>>,
) {
  return useQuery<Methodology, ApiClientError>({
    queryKey: ['methodology'],
    queryFn: ({ signal }) => api.methodology(signal),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Single-node detail. Disabled when `id` is null so callers can pass the
 * Zustand `selectedNodeId` directly without a wrapping guard.
 */
export function useNode(
  id: string | null,
  options?: Partial<UseQueryOptions<NodeDetail, ApiClientError>>,
) {
  return useQuery<NodeDetail, ApiClientError>({
    queryKey: ['node', id],
    queryFn: ({ signal }) => api.node(id as string, signal),
    enabled: id != null,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * FTS5 search. Disabled while the query is shorter than 2 chars so a single
 * accidental keystroke doesn't trigger a request.
 */
export function useSearch(
  query: string,
  limit?: number,
  options?: Partial<UseQueryOptions<SearchResponse, ApiClientError>>,
) {
  const trimmed = query.trim();
  return useQuery<SearchResponse, ApiClientError>({
    queryKey: ['search', trimmed, limit ?? null],
    queryFn: ({ signal }) => api.search(trimmed, limit, signal),
    enabled: trimmed.length >= 2,
    staleTime: 60 * 1000,
    ...options,
  });
}
