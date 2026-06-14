'use client';

/**
 * Methodology UI state — Zustand.
 *
 * Split into two halves:
 *
 *  - **Ephemeral UI state** (selectedNodeId, panelOpen, activePhase,
 *    searchQuery, searchOpen, filters, helpOpen). Lives in memory only; the
 *    URL is the source of truth for selectedNodeId so it survives reloads
 *    via Next.js routing, not the store.
 *
 *  - **Persisted slice** (per-node progress checklist, per-node notes, and
 *    the recently-viewed list). Persisted to localStorage via Zustand's
 *    `persist` middleware so a user working through the OSCP keeps their
 *    place — and their notes — across sessions.
 */

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { Playbook, PlaybookStep } from '@/features/playbook/types';
import type { QuizRecord } from '@/features/study/deck';

import type { Difficulty, NodeSummary, ProgressStatus, Severity } from './types';

/**
 * Generate a short unique id for playbooks / steps. Crypto-backed when
 * available (browser + secure context), with a deterministic-enough fallback
 * for SSR / older runtimes — collisions don't matter here, only uniqueness
 * within a single user's local store.
 */
function uid(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/**
 * A `localStorage`-backed storage that never throws.
 *
 * Browsers can make `localStorage` unusable in ways that surface only at
 * runtime: Safari Private Browsing historically threw on every write, embedded
 * webviews / "block third-party data" settings can throw on mere *access*, and
 * a full origin raises `QuotaExceededError` on `setItem`. The default zustand
 * storage lets those errors bubble out of the `set` call that triggered the
 * write — which here means starring a node, saving a note, or recording a quiz
 * could throw mid-render and wedge the UI.
 *
 * This wrapper probes once, then guards every operation. On any failure it
 * transparently falls back to an in-memory map, so the app keeps working for
 * the session (just without cross-session persistence) instead of crashing.
 * The persisted key, shape, version and migration are all unchanged — this is
 * purely a resilience layer around the same data.
 */
function createSafeStorage(): StateStorage {
  const memory = new Map<string, string>();
  let backend: Storage | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Some environments expose `localStorage` but throw on first use, so we
      // exercise a real write/remove round-trip before trusting it.
      const probe = '__windowspe_probe__';
      window.localStorage.setItem(probe, probe);
      window.localStorage.removeItem(probe);
      backend = window.localStorage;
    }
  } catch {
    backend = null;
  }

  return {
    getItem: (name) => {
      try {
        if (backend) return backend.getItem(name);
      } catch {
        // fall through to the in-memory copy
      }
      return memory.has(name) ? (memory.get(name) as string) : null;
    },
    setItem: (name, value) => {
      // Keep the in-memory copy authoritative so a later quota failure can't
      // lose state the user already produced this session.
      memory.set(name, value);
      try {
        backend?.setItem(name, value);
      } catch {
        // quota exceeded / unavailable — the memory copy carries the session
      }
    },
    removeItem: (name) => {
      memory.delete(name);
      try {
        backend?.removeItem(name);
      } catch {
        // ignore — nothing actionable
      }
    },
  };
}

/** Canvas filter facets. Empty arrays / null mean "no filter on this facet". */
export interface Filters {
  severities: Severity[];
  difficulties: Difficulty[];
  tag: string | null;
}

const EMPTY_FILTERS: Filters = {
  severities: [],
  difficulties: [],
  tag: null,
};

/** How many recently-viewed nodes we retain. */
const RECENTS_LIMIT = 8;

/** How many search history entries we retain. */
const SEARCH_HISTORY_LIMIT = 20;

/**
 * Target context — the values that get substituted into snippet placeholders
 * so commands are copy-paste-ready during an engagement. Defaults equal the
 * canonical placeholders used in the content, so substitution is a no-op
 * until the user customises them.
 */
export interface TargetVars {
  lhost: string;
  lport: string;
  targetIp: string;
  domain: string;
  workdir: string;
  payload: string;
}

export const DEFAULT_VARS: TargetVars = {
  lhost: '10.10.14.5',
  lport: '4444',
  targetIp: '10.10.10.10',
  domain: 'corp.local',
  workdir: 'C:\\Temp',
  payload: 'payload.exe',
};

interface MethodologyState {
  // ---------- ephemeral ----------
  selectedNodeId: string | null;
  panelOpen: boolean;
  activePhase: string | null;
  searchOpen: boolean;
  searchQuery: string;
  filters: Filters;
  filterBarOpen: boolean;
  showLinks: boolean;
  focusMode: boolean;
  /** Node ids on the selected node's lineage (ancestors + self + children +
   *  phase anchor). Recomputed by the canvas when the selection changes. */
  focusPath: string[];
  helpOpen: boolean;
  analyzerOpen: boolean;
  wizardOpen: boolean;
  studyOpen: boolean;
  playbookOpen: boolean;

  // ---------- persisted ----------
  progress: Record<string, ProgressStatus>;
  notes: Record<string, string>;
  recentIds: string[];
  vars: TargetVars;
  /** Node ids that the user has starred as favourites. */
  favorites: Record<string, boolean>;
  /** Recent search queries (most-recent first). */
  searchHistory: string[];
  /** User-authored kill-chain playbooks. */
  playbooks: Playbook[];
  /** The playbook currently being edited in the builder, or null. */
  activePlaybookId: string | null;
  /** Per-scope Study Mode quiz history (best/last score + attempts). */
  quizScores: Record<string, QuizRecord>;

  // ---------- actions ----------
  selectNode: (id: string | null) => void;
  closePanel: () => void;
  setActivePhase: (id: string | null) => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;

  toggleProgress: (id: string, status: ProgressStatus) => void;
  setProgress: (id: string, status: ProgressStatus | null) => void;
  resetProgress: () => void;

  setNote: (id: string, note: string) => void;
  pushRecent: (id: string) => void;

  toggleSeverityFilter: (s: Severity) => void;
  toggleDifficultyFilter: (d: Difficulty) => void;
  setTagFilter: (tag: string | null) => void;
  setFilters: (filters: Filters) => void;
  clearFilters: () => void;
  toggleFilterBar: () => void;
  setFilterBarOpen: (open: boolean) => void;
  toggleShowLinks: () => void;
  toggleFocusMode: () => void;
  setFocusPath: (ids: string[]) => void;

  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;

  setVar: (key: keyof TargetVars, value: string) => void;
  resetVars: () => void;

  openAnalyzer: () => void;
  closeAnalyzer: () => void;
  openWizard: () => void;
  closeWizard: () => void;
  openStudy: () => void;
  closeStudy: () => void;
  openPlaybook: () => void;
  closePlaybook: () => void;

  // ---------- playbook CRUD ----------
  /** Create a playbook and make it active. Returns the new id. */
  createPlaybook: (name?: string) => string;
  renamePlaybook: (id: string, name: string) => void;
  setPlaybookObjective: (id: string, objective: string) => void;
  deletePlaybook: (id: string) => void;
  setActivePlaybook: (id: string | null) => void;
  /** Append a node as a step to the given playbook (creates one if none). */
  addStepToPlaybook: (playbookId: string, nodeId: string) => void;
  /** Convenience: add a node to the active playbook, creating one on demand.
   *  Returns the playbook id the step landed in. */
  addNodeToActivePlaybook: (nodeId: string) => string;
  removeStep: (playbookId: string, uid: string) => void;
  moveStep: (playbookId: string, uid: string, dir: -1 | 1) => void;
  setStepNote: (playbookId: string, uid: string, note: string) => void;

  /** Favourites panel */
  favoritesOpen: boolean;
  openFavorites: () => void;
  closeFavorites: () => void;

  toggleFavorite: (id: string) => void;
  clearFavorites: () => void;

  pushSearchHistory: (query: string) => void;
  removeSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  /**
   * Record a completed quiz against a scope key. Returns whether it set a new
   * personal best and what the prior best was (null if first attempt), so the
   * results screen can celebrate appropriately.
   */
  recordQuizResult: (
    scopeKey: string,
    pct: number,
  ) => { isBest: boolean; previousBest: number | null };
}

export const useMethodologyStore = create<MethodologyState>()(
  persist(
    (set, get) => ({
      selectedNodeId: null,
      panelOpen: false,
      activePhase: null,
      searchOpen: false,
      searchQuery: '',
      filters: EMPTY_FILTERS,
      filterBarOpen: false,
      showLinks: false,
      focusMode: false,
      focusPath: [],
      helpOpen: false,
      analyzerOpen: false,
      wizardOpen: false,
      studyOpen: false,
      playbookOpen: false,
      favoritesOpen: false,
      progress: {},
      notes: {},
      recentIds: [],
      vars: DEFAULT_VARS,
      favorites: {},
      searchHistory: [],
      playbooks: [],
      activePlaybookId: null,
      quizScores: {},

      selectNode: (id) => set({ selectedNodeId: id, panelOpen: id != null }),

      closePanel: () => set({ panelOpen: false }),

      setActivePhase: (id) => set({ activePhase: id }),

      openSearch: () => set({ searchOpen: true }),
      closeSearch: () => set({ searchOpen: false, searchQuery: '' }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      toggleProgress: (id, status) =>
        set((state) => {
          const next = { ...state.progress };
          if (next[id] === status) {
            delete next[id];
          } else {
            next[id] = status;
          }
          return { progress: next };
        }),

      setProgress: (id, status) =>
        set((state) => {
          const next = { ...state.progress };
          if (status == null) delete next[id];
          else next[id] = status;
          return { progress: next };
        }),

      resetProgress: () => set({ progress: {} }),

      setNote: (id, note) =>
        set((state) => {
          const next = { ...state.notes };
          // Empty / whitespace-only notes are dropped so the persisted blob
          // doesn't accumulate stale keys.
          if (note.trim() === '') delete next[id];
          else next[id] = note;
          return { notes: next };
        }),

      pushRecent: (id) =>
        set((state) => {
          const next = [id, ...state.recentIds.filter((x) => x !== id)];
          return { recentIds: next.slice(0, RECENTS_LIMIT) };
        }),

      toggleSeverityFilter: (s) =>
        set((state) => {
          const has = state.filters.severities.includes(s);
          return {
            filters: {
              ...state.filters,
              severities: has
                ? state.filters.severities.filter((x) => x !== s)
                : [...state.filters.severities, s],
            },
          };
        }),

      toggleDifficultyFilter: (d) =>
        set((state) => {
          const has = state.filters.difficulties.includes(d);
          return {
            filters: {
              ...state.filters,
              difficulties: has
                ? state.filters.difficulties.filter((x) => x !== d)
                : [...state.filters.difficulties, d],
            },
          };
        }),

      setTagFilter: (tag) =>
        set((state) => ({ filters: { ...state.filters, tag } })),

      setFilters: (filters) => set({ filters }),

      clearFilters: () => set({ filters: EMPTY_FILTERS }),

      toggleFilterBar: () => set((state) => ({ filterBarOpen: !state.filterBarOpen })),
      setFilterBarOpen: (open) => set({ filterBarOpen: open }),
      toggleShowLinks: () => set((state) => ({ showLinks: !state.showLinks })),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      setFocusPath: (ids) => set({ focusPath: ids }),

      openHelp: () => set({ helpOpen: true }),
      closeHelp: () => set({ helpOpen: false }),
      toggleHelp: () => set((state) => ({ helpOpen: !state.helpOpen })),

      setVar: (key, value) =>
        set((state) => ({ vars: { ...state.vars, [key]: value } })),
      resetVars: () => set({ vars: DEFAULT_VARS }),

      openAnalyzer: () => set({ analyzerOpen: true }),
      closeAnalyzer: () => set({ analyzerOpen: false }),
      openWizard: () => set({ wizardOpen: true }),
      closeWizard: () => set({ wizardOpen: false }),
      openStudy: () => set({ studyOpen: true }),
      closeStudy: () => set({ studyOpen: false }),
      openPlaybook: () => set({ playbookOpen: true }),
      closePlaybook: () => set({ playbookOpen: false }),

      // ----- playbook CRUD -----

      createPlaybook: (name) => {
        const id = uid('pb');
        const now = Date.now();
        const playbook: Playbook = {
          id,
          name: name?.trim() || 'New playbook',
          objective: '',
          steps: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          playbooks: [...state.playbooks, playbook],
          activePlaybookId: id,
        }));
        return id;
      },

      renamePlaybook: (id, name) =>
        set((state) => ({
          playbooks: state.playbooks.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p,
          ),
        })),

      setPlaybookObjective: (id, objective) =>
        set((state) => ({
          playbooks: state.playbooks.map((p) =>
            p.id === id ? { ...p, objective, updatedAt: Date.now() } : p,
          ),
        })),

      deletePlaybook: (id) =>
        set((state) => {
          const playbooks = state.playbooks.filter((p) => p.id !== id);
          const activePlaybookId =
            state.activePlaybookId === id
              ? (playbooks[0]?.id ?? null)
              : state.activePlaybookId;
          return { playbooks, activePlaybookId };
        }),

      setActivePlaybook: (id) => set({ activePlaybookId: id }),

      addStepToPlaybook: (playbookId, nodeId) =>
        set((state) => ({
          playbooks: state.playbooks.map((p) =>
            p.id === playbookId
              ? {
                  ...p,
                  steps: [...p.steps, { uid: uid('st'), nodeId, note: '' }],
                  updatedAt: Date.now(),
                }
              : p,
          ),
        })),

      addNodeToActivePlaybook: (nodeId) => {
        const state = get();
        // Resolve (or create) the target playbook id synchronously so callers
        // can reference it (e.g. an inline "added to <name>" confirmation).
        let targetId = state.activePlaybookId;
        const exists = state.playbooks.some((p) => p.id === targetId);
        if (!targetId || !exists) {
          targetId = state.createPlaybook('My kill chain');
        }
        state.addStepToPlaybook(targetId, nodeId);
        return targetId;
      },

      removeStep: (playbookId, stepUid) =>
        set((state) => ({
          playbooks: state.playbooks.map((p) =>
            p.id === playbookId
              ? {
                  ...p,
                  steps: p.steps.filter((s) => s.uid !== stepUid),
                  updatedAt: Date.now(),
                }
              : p,
          ),
        })),

      moveStep: (playbookId, stepUid, dir) =>
        set((state) => ({
          playbooks: state.playbooks.map((p) => {
            if (p.id !== playbookId) return p;
            const idx = p.steps.findIndex((s) => s.uid === stepUid);
            const swap = idx + dir;
            if (idx < 0 || swap < 0 || swap >= p.steps.length) return p;
            const steps = p.steps.slice();
            const a = steps[idx] as PlaybookStep;
            steps[idx] = steps[swap] as PlaybookStep;
            steps[swap] = a;
            return { ...p, steps, updatedAt: Date.now() };
          }),
        })),

      setStepNote: (playbookId, stepUid, note) =>
        set((state) => ({
          playbooks: state.playbooks.map((p) =>
            p.id === playbookId
              ? {
                  ...p,
                  steps: p.steps.map((s) =>
                    s.uid === stepUid ? { ...s, note } : s,
                  ),
                  updatedAt: Date.now(),
                }
              : p,
          ),
        })),

      openFavorites: () => set({ favoritesOpen: true }),
      closeFavorites: () => set({ favoritesOpen: false }),

      toggleFavorite: (id) =>
        set((state) => {
          const next = { ...state.favorites };
          if (next[id]) {
            delete next[id];
          } else {
            next[id] = true;
          }
          return { favorites: next };
        }),

      clearFavorites: () => set({ favorites: {} }),

      pushSearchHistory: (query) =>
        set((state) => {
          const q = query.trim();
          if (!q || q.length < 2) return {};
          const next = [q, ...state.searchHistory.filter((x) => x !== q)];
          return { searchHistory: next.slice(0, SEARCH_HISTORY_LIMIT) };
        }),

      removeSearchHistory: (query) =>
        set((state) => ({
          searchHistory: state.searchHistory.filter((x) => x !== query),
        })),

      clearSearchHistory: () => set({ searchHistory: [] }),

      recordQuizResult: (scopeKey, pct) => {
        // Clamp to a sane 0–100 integer so a malformed call can't poison the
        // persisted best.
        const clamped = Math.max(0, Math.min(100, Math.round(pct)));
        const prev = get().quizScores[scopeKey];
        const previousBest = prev ? prev.bestPct : null;
        const isBest = previousBest == null || clamped > previousBest;
        set((state) => {
          const existing = state.quizScores[scopeKey];
          const next: QuizRecord = {
            bestPct: existing ? Math.max(existing.bestPct, clamped) : clamped,
            lastPct: clamped,
            attempts: (existing?.attempts ?? 0) + 1,
            lastAt: Date.now(),
          };
          return { quizScores: { ...state.quizScores, [scopeKey]: next } };
        });
        return { isBest, previousBest };
      },
    }),
    {
      name: 'windowspe.state.v1',
      // Wrap localStorage in a never-throw adapter so private-mode / quota /
      // blocked-storage environments degrade to in-memory state instead of
      // throwing out of a `set` call. JSON (de)serialisation is unchanged.
      storage: createJSONStorage(() => createSafeStorage()),
      // Persist the durable slice only — ephemeral UI state (selection,
      // filters, help) should not survive reloads.
      partialize: (state) => ({
        progress: state.progress,
        notes: state.notes,
        recentIds: state.recentIds,
        vars: state.vars,
        favorites: state.favorites,
        searchHistory: state.searchHistory,
        playbooks: state.playbooks,
        activePlaybookId: state.activePlaybookId,
        quizScores: state.quizScores,
      }),
      version: 6,
      // Older versions persisted a subset of keys. Carry whatever exists
      // forward and fill any missing keys from defaults, so upgrading never
      // wipes a user's checklist / notes and new fields (vars, playbooks)
      // appear cleanly.
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<{
          progress: Record<string, ProgressStatus>;
          notes: Record<string, string>;
          recentIds: string[];
          vars: Partial<TargetVars>;
          favorites: Record<string, boolean>;
          searchHistory: string[];
          playbooks: Playbook[];
          activePlaybookId: string | null;
          quizScores: Record<string, QuizRecord>;
        }>;
        return {
          progress: p.progress ?? {},
          notes: p.notes ?? {},
          recentIds: p.recentIds ?? [],
          vars: { ...DEFAULT_VARS, ...(p.vars ?? {}) },
          favorites: p.favorites ?? {},
          searchHistory: p.searchHistory ?? [],
          playbooks: p.playbooks ?? [],
          activePlaybookId: p.activePlaybookId ?? null,
          quizScores: p.quizScores ?? {},
        };
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Selector helpers — keep components from importing the whole store object
// (avoids re-render storms).
// ---------------------------------------------------------------------------

export const selectVars = (s: MethodologyState) => s.vars;
export const selectAnalyzerOpen = (s: MethodologyState) => s.analyzerOpen;
export const selectWizardOpen = (s: MethodologyState) => s.wizardOpen;
export const selectStudyOpen = (s: MethodologyState) => s.studyOpen;
export const selectPlaybookOpen = (s: MethodologyState) => s.playbookOpen;
export const selectPlaybooks = (s: MethodologyState) => s.playbooks;
export const selectActivePlaybookId = (s: MethodologyState) => s.activePlaybookId;
export const selectFavoritesOpen = (s: MethodologyState) => s.favoritesOpen;
export const selectFavorites = (s: MethodologyState) => s.favorites;
export const selectSearchHistory = (s: MethodologyState) => s.searchHistory;

/**
 * The persisted quiz record for a given scope key, or undefined if the scope
 * has never been completed. Returns the stored object reference (stable until
 * the record updates), so it's safe to use directly as a selector.
 */
export const selectQuizRecord =
  (scopeKey: string) =>
  (s: MethodologyState): QuizRecord | undefined =>
    s.quizScores[scopeKey];

/** Total step count across all playbooks — drives the topbar button badge. */
export const selectPlaybookStepCount = (s: MethodologyState): number =>
  s.playbooks.reduce((sum, p) => sum + p.steps.length, 0);

export const selectSelectedNodeId = (s: MethodologyState) => s.selectedNodeId;
export const selectPanelOpen = (s: MethodologyState) => s.panelOpen;
export const selectActivePhase = (s: MethodologyState) => s.activePhase;
export const selectSearchOpen = (s: MethodologyState) => s.searchOpen;
export const selectSearchQuery = (s: MethodologyState) => s.searchQuery;
export const selectProgress = (s: MethodologyState) => s.progress;
export const selectNotes = (s: MethodologyState) => s.notes;
export const selectRecentIds = (s: MethodologyState) => s.recentIds;
export const selectFilters = (s: MethodologyState) => s.filters;
export const selectFilterBarOpen = (s: MethodologyState) => s.filterBarOpen;
export const selectShowLinks = (s: MethodologyState) => s.showLinks;
export const selectFocusMode = (s: MethodologyState) => s.focusMode;
export const selectHelpOpen = (s: MethodologyState) => s.helpOpen;

/**
 * Is this node dimmed by focus mode? Returns false (not dimmed) whenever
 * focus mode is off or nothing is selected, so callers can use it
 * unconditionally. Returns a stable boolean — safe to use as a selector.
 */
export const selectNodeDimmedByFocus =
  (id: string) =>
  (s: MethodologyState): boolean =>
    s.focusMode && s.focusPath.length > 0 && !s.focusPath.includes(id);

export const selectNodeProgress =
  (id: string) =>
  (s: MethodologyState): ProgressStatus | undefined =>
    s.progress[id];

export const selectNodeFavorite =
  (id: string) =>
  (s: MethodologyState): boolean =>
    !!s.favorites[id];

export const selectProgressCount = (s: MethodologyState): {
  done: number;
  skipped: number;
  total: number;
} => {
  let done = 0;
  let skipped = 0;
  for (const status of Object.values(s.progress)) {
    if (status === 'done') done += 1;
    else if (status === 'skipped') skipped += 1;
  }
  return { done, skipped, total: done + skipped };
};

/** Count of active filter facets — drives the badge on the filter button. */
export const selectActiveFilterCount = (s: MethodologyState): number =>
  s.filters.severities.length +
  s.filters.difficulties.length +
  (s.filters.tag ? 1 : 0);

/**
 * Pure predicate: does a node pass the active filters? Lives here (not in a
 * component) so both the canvas dimming and any future list view share one
 * definition. A facet with no selections doesn't constrain anything.
 */
export function nodeMatchesFilters(
  node: Pick<NodeSummary, 'severity' | 'difficulty' | 'tags'>,
  filters: Filters,
): boolean {
  if (filters.severities.length > 0 && !filters.severities.includes(node.severity)) {
    return false;
  }
  if (
    filters.difficulties.length > 0 &&
    !filters.difficulties.includes(node.difficulty)
  ) {
    return false;
  }
  if (filters.tag && !node.tags.includes(filters.tag)) {
    return false;
  }
  return true;
}
