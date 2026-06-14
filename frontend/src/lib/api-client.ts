/**
 * Thin fetch wrapper for the WindowsPE backend.
 *
 * Centralises:
 *  - Base URL resolution from `NEXT_PUBLIC_API_BASE_URL`
 *  - The `{ data, error }` envelope contract (always unwraps to `data`)
 *  - A typed `ApiClientError` so React Query / call sites can branch on
 *    `error.code` instead of inspecting raw HTTP status codes
 *  - AbortSignal threading for request cancellation on unmount / route change
 */

import type {
  ApiResponse,
  HealthResponse,
  Methodology,
  NodeDetail,
  SearchResponse,
} from '@/features/methodology/types';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number | undefined;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }

  /** True for 4xx-like failures the user can do something about. */
  get isUserError(): boolean {
    return this.code === 'not_found' || this.code === 'bad_request';
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  query?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: opts.signal,
      // Browser-default caching so the backend's ETag / Cache-Control can do
      // its job: repeat requests revalidate with a conditional GET and get a
      // cheap 304 instead of re-downloading the whole methodology payload.
      // React Query still governs *when* we refetch (staleTime); this governs
      // how cheap that refetch is on the wire.
      cache: 'default',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new ApiClientError('network_error', 'Failed to reach the WindowsPE API.');
  }

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(
      'invalid_response',
      `Server returned non-JSON (status ${res.status}).`,
      res.status,
    );
  }

  if (!res.ok || body.error || body.data == null) {
    const code = body.error?.code ?? `http_${res.status}`;
    const message = body.error?.message ?? res.statusText ?? 'request failed';
    throw new ApiClientError(code, message, res.status);
  }

  return body.data;
}

export const api = {
  health: (signal?: AbortSignal) =>
    request<HealthResponse>('/health', { signal }),

  methodology: (signal?: AbortSignal) =>
    request<Methodology>('/methodology', { signal }),

  node: (id: string, signal?: AbortSignal) =>
    request<NodeDetail>(`/nodes/${encodeURIComponent(id)}`, { signal }),

  search: (q: string, limit?: number, signal?: AbortSignal) =>
    request<SearchResponse>('/search', { signal, query: { q, limit } }),
};

export type WindowsPeApi = typeof api;
