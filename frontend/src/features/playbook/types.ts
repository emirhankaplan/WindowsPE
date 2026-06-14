/**
 * Playbook / kill-chain — local data model.
 *
 * A *playbook* is an ordered sequence of techniques the user assembles from
 * the methodology graph into a concrete attack (or defensive walk-through)
 * scenario. Each *step* references a node id and carries a per-step
 * operator note. Playbooks live entirely in the persisted Zustand slice
 * (localStorage) — no backend, no network — so this is purely a frontend
 * layer on top of the cached methodology payload.
 *
 * Steps store only the node id; everything displayable (title, severity,
 * MITRE id, phase, …) is resolved against the live `Methodology` tree at
 * render time. That keeps a playbook tiny to persist and immune to content
 * drift — a renamed technique simply shows its new title, and a deleted node
 * is rendered as a graceful "missing technique" placeholder.
 */

/** One ordered step in a playbook. */
export interface PlaybookStep {
  /** Stable per-step id (not the node id) so React keys survive reorders. */
  uid: string;
  /** Methodology node this step points at. */
  nodeId: string;
  /** Operator note for this step (objective, expected output, caveats…). */
  note: string;
}

/** A named, ordered kill-chain scenario. */
export interface Playbook {
  id: string;
  name: string;
  /** Free-text scenario objective / context shown at the top of the export. */
  objective: string;
  steps: PlaybookStep[];
  /** Epoch millis — creation + last edit, for sorting and the export header. */
  createdAt: number;
  updatedAt: number;
}
