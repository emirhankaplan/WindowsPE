/**
 * Wire types — one-to-one mirror of the Rust DTOs in
 * `backend/src/interfaces/dto/`.
 *
 * Rule: this file is the **only** source of truth for the API contract on
 * the frontend. If the Rust DTOs change, this file changes; nothing else
 * should restate these shapes.
 */

// ---------------------------------------------------------------------------
// Enums (string literal unions match `#[serde(rename_all = ...)]`)
// ---------------------------------------------------------------------------

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type Difficulty = 'oscp-basic' | 'oscp-advanced' | 'red-team';

export type NodeKind = 'phase' | 'category' | 'technique' | 'tool';

export type EdgeKind = 'child' | 'prerequisite' | 'related';

export type Shell = 'powershell' | 'cmd' | 'bash' | 'c' | 'text';

export type RefKind =
  | 'mitre'
  | 'hacktricks'
  | 'msdoc'
  | 'cve'
  | 'blog'
  | 'tool'
  | 'paper';

// ---------------------------------------------------------------------------
// GET /api/v1/methodology
// ---------------------------------------------------------------------------

export interface PhaseSummary {
  id: string;
  title: string;
  ordinal: number;
  icon: string | null;
  accent_color: string | null;
}

export interface NodeSummary {
  id: string;
  phase_id: string;
  parent_id: string | null;
  kind: NodeKind;
  title: string;
  summary: string;
  severity: Severity;
  difficulty: Difficulty;
  mitre_attack_id: string | null;
  tags: string[];
}

export interface Edge {
  source: string;
  target: string;
  kind: EdgeKind;
}

export interface Methodology {
  version: string;
  phases: PhaseSummary[];
  nodes: NodeSummary[];
  edges: Edge[];
}

// ---------------------------------------------------------------------------
// GET /api/v1/nodes/:id
// ---------------------------------------------------------------------------

export interface Snippet {
  id: number;
  shell: Shell;
  title: string;
  code: string;
  description: string | null;
  requires_admin: boolean;
}

export interface Reference {
  title: string;
  url: string;
  kind: RefKind;
}

export interface NodeRef {
  id: string;
  title: string;
}

export interface NodeDetail {
  id: string;
  phase_id: string;
  parent_id: string | null;
  kind: NodeKind;
  title: string;
  summary: string;
  description_md: string;
  severity: Severity;
  difficulty: Difficulty;
  mitre_attack_id: string | null;
  detection_hints: string | null;
  tags: string[];
  snippets: Snippet[];
  references: Reference[];
  prerequisites: NodeRef[];
  related: NodeRef[];
}

// ---------------------------------------------------------------------------
// GET /api/v1/search
// ---------------------------------------------------------------------------

export interface SearchHit {
  node_id: string;
  title: string;
  phase_id: string;
  severity: Severity;
  /** HTML excerpt with `<mark>` highlights — backend pre-sanitises. */
  snippet: string;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
}

// ---------------------------------------------------------------------------
// GET /api/v1/health
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: 'ok';
  methodology_version: string;
}

// ---------------------------------------------------------------------------
// Envelope (uniform `{ data, error }` from the backend)
// ---------------------------------------------------------------------------

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

// ---------------------------------------------------------------------------
// Local UI types
// ---------------------------------------------------------------------------

export type ProgressStatus = 'done' | 'skipped';
