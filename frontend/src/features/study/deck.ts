/**
 * Study Mode — pure deck + quiz generation logic.
 *
 * Everything here is a pure function of the in-memory methodology graph
 * (`Methodology` from `/api/v1/methodology`). No network, no React, no store
 * access — so it is trivially testable and reused by both the flashcard and
 * quiz views.
 *
 * The methodology summary already carries enough signal to drive a rich
 * self-test without a backend change: title, summary, severity, difficulty,
 * MITRE ATT&CK id, tags, kind and phase. We turn that into:
 *
 *  - **Flashcards** — one card per actionable node (technique / tool /
 *    category). Front = title + phase + severity; back = summary, MITRE id,
 *    difficulty, tags.
 *  - **Quiz questions** — auto-generated multiple-choice items derived from
 *    the same fields. Three question kinds keep variety high:
 *      • `phase`  — "Which phase does <technique> belong to?"
 *      • `mitre`  — "Which MITRE ATT&CK technique maps to <technique>?"
 *      • `summary`— "Which technique matches this description?"
 */

import type {
  Difficulty,
  Methodology,
  NodeSummary,
  PhaseSummary,
  Severity,
} from '@/features/methodology/types';

// ---------------------------------------------------------------------------
// Deck filtering
// ---------------------------------------------------------------------------

export interface DeckFilter {
  /** Restrict to a single phase id, or null for all phases. */
  phaseId: string | null;
  /** Restrict to selected difficulties, or empty for all. */
  difficulties: Difficulty[];
}

export const EMPTY_DECK_FILTER: DeckFilter = {
  phaseId: null,
  difficulties: [],
};

/**
 * The node kinds worth studying. Phases themselves aren't cards; everything
 * actionable or conceptual (`category`, `technique`, `tool`) is.
 */
const STUDYABLE_KINDS = new Set<NodeSummary['kind']>([
  'category',
  'technique',
  'tool',
]);

/** Apply a deck filter to the methodology nodes, returning studyable cards. */
export function selectDeckNodes(
  tree: Methodology,
  filter: DeckFilter,
): NodeSummary[] {
  return tree.nodes.filter((n) => {
    if (!STUDYABLE_KINDS.has(n.kind)) return false;
    if (filter.phaseId && n.phase_id !== filter.phaseId) return false;
    if (
      filter.difficulties.length > 0 &&
      !filter.difficulties.includes(n.difficulty)
    ) {
      return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Deterministic shuffle (seeded) — stable across re-renders for one session
// ---------------------------------------------------------------------------

/** Mulberry32 PRNG — tiny, fast, deterministic from a 32-bit seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * In-place Fisher–Yates shuffle of `arr` using `rng`. Written with an explicit
 * temp swap (not array-destructuring) so it type-checks cleanly under
 * `noUncheckedIndexedAccess`.
 */
function swapShuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
}

/** Pure Fisher–Yates shuffle driven by a seeded PRNG. Does not mutate input. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = items.slice();
  swapShuffle(out, rng);
  return out;
}

/** Derive a stable numeric seed from a string (FNV-1a 32-bit). */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export interface Flashcard {
  id: string;
  title: string;
  summary: string;
  phaseTitle: string;
  severity: Severity;
  difficulty: Difficulty;
  mitreId: string | null;
  tags: string[];
}

/** Build a shuffled flashcard deck from filtered nodes. */
export function buildFlashcards(
  tree: Methodology,
  filter: DeckFilter,
  seed: number,
): Flashcard[] {
  const phaseTitle = new Map(tree.phases.map((p) => [p.id, p.title]));
  const nodes = selectDeckNodes(tree, filter);
  const cards: Flashcard[] = nodes.map((n) => ({
    id: n.id,
    title: n.title,
    summary: n.summary,
    phaseTitle: phaseTitle.get(n.phase_id) ?? n.phase_id,
    severity: n.severity,
    difficulty: n.difficulty,
    mitreId: n.mitre_attack_id,
    tags: n.tags,
  }));
  return seededShuffle(cards, seed);
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export type QuizKind = 'phase' | 'mitre' | 'summary';

export interface QuizChoice {
  /** Stable id so React keys are stable and the answer is unambiguous. */
  key: string;
  label: string;
}

export interface QuizQuestion {
  /** Node the question is about — used to navigate on review. */
  nodeId: string;
  kind: QuizKind;
  prompt: string;
  /** Context line shown under the prompt (e.g. the technique title). */
  context: string | null;
  choices: QuizChoice[];
  correctKey: string;
}

const MAX_CHOICES = 4;

/** Pick `n` distinct random items (excluding `exclude`) from a pool. */
function sample<T>(
  pool: readonly T[],
  n: number,
  rng: () => number,
  exclude: (t: T) => boolean,
): T[] {
  const candidates = pool.filter((t) => !exclude(t));
  // Shuffle a copy with the provided rng, then take the first n.
  const arr = candidates.slice();
  swapShuffle(arr, rng);
  return arr.slice(0, n);
}

/**
 * Build a quiz of up to `count` multiple-choice questions from the filtered
 * deck. Generation is deterministic given the same `seed`, so re-renders
 * never reshuffle a live session. Questions whose distractor pool is too
 * small are skipped rather than rendered with fewer than two options.
 */
export function buildQuiz(
  tree: Methodology,
  filter: DeckFilter,
  count: number,
  seed: number,
): QuizQuestion[] {
  const rng = mulberry32(seed);
  const deck = seededShuffle(selectDeckNodes(tree, filter), seed);

  const phases: PhaseSummary[] = tree.phases;
  const phaseTitle = new Map(phases.map((p) => [p.id, p.title]));
  const allMitre = tree.nodes
    .map((n) => n.mitre_attack_id)
    .filter((m): m is string => !!m);
  const uniqueMitre = [...new Set(allMitre)];

  const questions: QuizQuestion[] = [];

  for (const node of deck) {
    if (questions.length >= count) break;

    // Rotate question kinds based on what data the node actually has, so we
    // never ask a MITRE question about a node with no MITRE id.
    const kinds: QuizKind[] = [];
    if (phases.length >= 2) kinds.push('phase');
    if (node.mitre_attack_id && uniqueMitre.length >= 2) kinds.push('mitre');
    if (deck.length >= 2) kinds.push('summary');
    if (kinds.length === 0) continue;

    const kind = kinds[Math.floor(rng() * kinds.length)];

    if (kind === 'phase') {
      const correctTitle = phaseTitle.get(node.phase_id);
      if (!correctTitle) continue;
      const distractors = sample(
        phases,
        MAX_CHOICES - 1,
        rng,
        (p) => p.id === node.phase_id,
      ).map((p) => p.title);
      const q = assembleQuestion(
        node.id,
        'phase',
        `Which phase does this technique belong to?`,
        node.title,
        correctTitle,
        distractors,
        rng,
      );
      if (q) questions.push(q);
    } else if (kind === 'mitre') {
      const correct = node.mitre_attack_id!;
      const distractors = sample(
        uniqueMitre,
        MAX_CHOICES - 1,
        rng,
        (m) => m === correct,
      );
      const q = assembleQuestion(
        node.id,
        'mitre',
        `Which MITRE ATT&CK technique maps to this?`,
        node.title,
        correct,
        distractors,
        rng,
      );
      if (q) questions.push(q);
    } else {
      // summary → "which technique matches this description?"
      const correct = node.title;
      const distractors = sample(
        deck,
        MAX_CHOICES - 1,
        rng,
        (n) => n.id === node.id || n.title === correct,
      ).map((n) => n.title);
      const q = assembleQuestion(
        node.id,
        'summary',
        `Which technique matches this description?`,
        node.summary,
        correct,
        distractors,
        rng,
      );
      if (q) questions.push(q);
    }
  }

  return questions;
}

/**
 * Assemble one question: combine the correct answer with distractors, shuffle
 * the option order with the session rng, and tag the correct option's key.
 * Returns null when there aren't at least two distinct options.
 */
function assembleQuestion(
  nodeId: string,
  kind: QuizKind,
  prompt: string,
  context: string | null,
  correct: string,
  distractors: string[],
  rng: () => number,
): QuizQuestion | null {
  // De-dupe distractors against the correct answer and each other.
  const seen = new Set<string>([correct]);
  const cleanDistractors: string[] = [];
  for (const d of distractors) {
    if (!seen.has(d)) {
      seen.add(d);
      cleanDistractors.push(d);
    }
  }
  if (cleanDistractors.length < 1) return null;

  const labels = [correct, ...cleanDistractors];
  // Shuffle option order.
  swapShuffle(labels, rng);

  const choices: QuizChoice[] = labels.map((label, i) => ({
    key: `c${i}`,
    label,
  }));
  const correctKey = choices.find((c) => c.label === correct)?.key;
  if (!correctKey) return null;

  return { nodeId, kind, prompt, context, choices, correctKey };
}

// ---------------------------------------------------------------------------
// Quiz scoring
// ---------------------------------------------------------------------------

export interface QuizResult {
  correct: number;
  total: number;
  /** 0–100 integer. */
  pct: number;
  /** Node ids the user got wrong — surfaced as "review these". */
  missedNodeIds: string[];
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<number, string>,
): QuizResult {
  let correct = 0;
  const missedNodeIds: string[] = [];
  questions.forEach((q, i) => {
    if (answers[i] === q.correctKey) correct += 1;
    else missedNodeIds.push(q.nodeId);
  });
  const total = questions.length;
  return {
    correct,
    total,
    pct: total > 0 ? Math.round((correct / total) * 100) : 0,
    missedNodeIds,
  };
}

// ---------------------------------------------------------------------------
// Quiz history — per-scope personal-best tracking (persisted by the store)
// ---------------------------------------------------------------------------

/**
 * One scope's running quiz record. A "scope" is a deck filter (phase +
 * difficulties), so a learner can track improvement on, say, "Token Privileges
 * · OSCP advanced" independently of an all-phases run.
 */
export interface QuizRecord {
  /** Best percentage ever scored on this scope (0–100). */
  bestPct: number;
  /** Most recent percentage scored. */
  lastPct: number;
  /** How many quizzes have been completed on this scope. */
  attempts: number;
  /** Epoch millis of the most recent completed quiz. */
  lastAt: number;
}

/**
 * Stable string key for a deck filter, used to bucket quiz records. Difficulty
 * order is normalised so `[basic, advanced]` and `[advanced, basic]` map to the
 * same scope.
 */
export function quizScopeKey(filter: DeckFilter): string {
  const diffs = [...filter.difficulties].sort().join('+') || 'all';
  return `${filter.phaseId ?? 'all'}|${diffs}`;
}
