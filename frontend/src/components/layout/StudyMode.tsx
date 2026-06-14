'use client';

/**
 * StudyMode — flashcard + quiz self-test for the methodology.
 *
 * A frontend-only learning layer on top of the existing methodology graph.
 * It generates a flippable flashcard deck and an auto-built multiple-choice
 * quiz from the same content the canvas renders (see
 * `features/study/deck.ts`), then ties results back into the existing
 * persisted progress store: rating a card "Knew it" marks the node `done`,
 * "Review" marks it `skipped`.
 *
 * Opened via the TopBar "study" button, the mobile menu, the `S` keyboard
 * shortcut, or the command palette. No network calls — everything is derived
 * from the already-cached methodology payload.
 *
 * Structure:
 *   StudyMode (Dialog shell)
 *     └ StudyContent (tabs + shared setup state)
 *         ├ StudySetup        — phase / difficulty pickers + deck size
 *         ├ FlashcardRunner   — flip-through deck, rate each card
 *         └ QuizRunner        — MCQ session + scored results
 */

import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  GraduationCap,
  ListChecks,
  PartyPopper,
  RotateCcw,
  Shuffle,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DifficultyBadge, SeverityBadge } from '@/components/panel/SeverityBadge';
import { useTree } from '@/features/methodology/hooks';
import {
  selectQuizRecord,
  selectStudyOpen,
  useMethodologyStore,
} from '@/features/methodology/store';
import {
  buildFlashcards,
  buildQuiz,
  EMPTY_DECK_FILTER,
  quizScopeKey,
  scoreQuiz,
  seedFromString,
  selectDeckNodes,
  type DeckFilter,
  type Flashcard,
  type QuizQuestion,
} from '@/features/study/deck';
import type { Difficulty, Methodology } from '@/features/methodology/types';
import { cn } from '@/lib/utils';

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'oscp-basic', label: 'OSCP basic' },
  { value: 'oscp-advanced', label: 'OSCP advanced' },
  { value: 'red-team', label: 'red team' },
];

const QUIZ_SIZE = 10;

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function StudyMode() {
  const open = useMethodologyStore(selectStudyOpen);
  const closeStudy = useMethodologyStore((s) => s.closeStudy);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? undefined : closeStudy())}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-canvas/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed left-1/2 top-[7vh] z-50 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-card border border-subtle bg-panel shadow-pop outline-none"
                style={{ maxHeight: '86vh' }}
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <VisuallyHidden>
                  <Dialog.Title>Study mode — flashcards and quiz</Dialog.Title>
                  <Dialog.Description>
                    Self-test on the privilege-escalation methodology with a
                    flippable flashcard deck and an auto-generated quiz.
                  </Dialog.Description>
                </VisuallyHidden>
                <StudyContent onClose={closeStudy} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Content + shared setup
// ---------------------------------------------------------------------------

function StudyContent({ onClose }: { onClose: () => void }) {
  const { data: tree } = useTree();
  const [filter, setFilter] = useState<DeckFilter>(EMPTY_DECK_FILTER);

  return (
    <Tabs.Root defaultValue="flashcards" className="flex flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3">
        <Tabs.List aria-label="Study sections" className="flex items-center gap-1">
          <TabTrigger value="flashcards" icon={BookOpen}>
            Flashcards
          </TabTrigger>
          <TabTrigger value="quiz" icon={Brain}>
            Quiz
          </TabTrigger>
        </Tabs.List>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted sm:flex">
            <GraduationCap className="h-3.5 w-3.5 text-accent" />
            study
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close study mode"
            className="flex h-11 w-11 items-center justify-center rounded-pill border border-hairline text-fg-secondary transition-colors hover:border-accent hover:text-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Tabs.Content value="flashcards" className="outline-none">
          {tree ? (
            <FlashcardRunner tree={tree} filter={filter} setFilter={setFilter} onClose={onClose} />
          ) : (
            <Loading />
          )}
        </Tabs.Content>
        <Tabs.Content value="quiz" className="outline-none">
          {tree ? (
            <QuizRunner tree={tree} filter={filter} setFilter={setFilter} onClose={onClose} />
          ) : (
            <Loading />
          )}
        </Tabs.Content>
      </div>
    </Tabs.Root>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-fg-muted">Loading methodology…</p>
    </div>
  );
}

function TabTrigger({
  value,
  icon: Icon,
  children,
}: {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'flex min-h-[44px] items-center gap-1.5 rounded-input px-3 py-1.5 font-mono text-xs text-fg-muted transition-colors',
        'hover:bg-elevated hover:text-fg',
        'data-[state=active]:bg-elevated data-[state=active]:text-accent',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </Tabs.Trigger>
  );
}

// ---------------------------------------------------------------------------
// Setup — shared filter controls (phase + difficulty)
// ---------------------------------------------------------------------------

function StudySetup({
  tree,
  filter,
  setFilter,
  deckCount,
  cta,
  ctaIcon: CtaIcon,
  onStart,
  intro,
  scopeStat,
}: {
  tree: Methodology;
  filter: DeckFilter;
  setFilter: (f: DeckFilter) => void;
  deckCount: number;
  cta: string;
  ctaIcon: React.ComponentType<{ className?: string }>;
  onStart: () => void;
  intro: React.ReactNode;
  /** Optional stat shown just above the start button (e.g. quiz best score). */
  scopeStat?: React.ReactNode;
}) {
  const phases = useMemo(
    () => [...tree.phases].sort((a, b) => a.ordinal - b.ordinal),
    [tree.phases],
  );

  const toggleDifficulty = (d: Difficulty) => {
    const has = filter.difficulties.includes(d);
    setFilter({
      ...filter,
      difficulties: has
        ? filter.difficulties.filter((x) => x !== d)
        : [...filter.difficulties, d],
    });
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="rounded-card border border-hairline bg-elevated/60 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="text-sm text-fg-secondary">{intro}</div>
        </div>
      </div>

      {/* Phase scope */}
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
          Phase
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            active={filter.phaseId === null}
            onClick={() => setFilter({ ...filter, phaseId: null })}
            label="All phases"
          />
          {phases.map((p) => (
            <Chip
              key={p.id}
              active={filter.phaseId === p.id}
              onClick={() => setFilter({ ...filter, phaseId: p.id })}
              label={`${String(p.ordinal).padStart(2, '0')} ${p.title}`}
            />
          ))}
        </div>
      </div>

      {/* Difficulty scope */}
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
          Difficulty {filter.difficulties.length === 0 && '(all)'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTY_OPTIONS.map((d) => (
            <Chip
              key={d.value}
              active={filter.difficulties.includes(d.value)}
              onClick={() => toggleDifficulty(d.value)}
              label={d.label}
            />
          ))}
        </div>
      </div>

      {scopeStat}

      {/* Start */}
      <button
        type="button"
        onClick={onStart}
        disabled={deckCount === 0}
        className={cn(
          'flex h-12 w-full items-center justify-center gap-2.5 rounded-card border text-sm font-medium transition-all',
          'border-accent/30 bg-accent/5 text-accent hover:border-accent/50 hover:bg-accent/10',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        <CtaIcon className="h-4 w-4" />
        {deckCount === 0 ? 'No cards match — widen the filters' : `${cta} · ${deckCount} cards`}
      </button>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'min-h-[44px] rounded-pill border px-3 py-1.5 text-xs transition-colors',
        active
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-hairline text-fg-secondary hover:border-subtle hover:text-fg',
      )}
    >
      {label}
    </button>
  );
}

/** A compact "⟨keys⟩ label" hint used in the study runners' keyboard legend. */
function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="rounded border border-hairline bg-elevated px-1.5 py-0.5 text-[10px] text-fg-secondary"
        >
          {k}
        </kbd>
      ))}
      <span className="ml-0.5">{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

function FlashcardRunner({
  tree,
  filter,
  setFilter,
  onClose,
}: {
  tree: Methodology;
  filter: DeckFilter;
  setFilter: (f: DeckFilter) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const setProgress = useMethodologyStore((s) => s.setProgress);

  // `null` = setup screen. A number = running, index into the deck.
  const [seed, setSeed] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const deckCount = useMemo(
    () => selectDeckNodes(tree, filter).length,
    [tree, filter],
  );

  const cards: Flashcard[] = useMemo(
    () => (seed == null ? [] : buildFlashcards(tree, filter, seed)),
    [tree, filter, seed],
  );

  const start = () => {
    setSeed(seedFromString(`flash-${filter.phaseId ?? 'all'}-${filter.difficulties.join(',')}-${Date.now()}`));
    setIndex(0);
    setFlipped(false);
  };

  const next = useCallback(() => {
    setFlipped(false);
    setIndex((i) => Math.min(i + 1, cards.length - 1));
  }, [cards.length]);

  const prev = useCallback(() => {
    setFlipped(false);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const rate = useCallback(
    (status: 'done' | 'skipped') => {
      const card = cards[index];
      if (card) setProgress(card.id, status);
      if (index < cards.length - 1) next();
    },
    [cards, index, setProgress, next],
  );

  const goToNode = (id: string) => {
    onClose();
    selectNode(id);
    router.push(`/node/${encodeURIComponent(id)}`);
  };

  // Keyboard navigation while a deck is running. Uses keys that never collide
  // with the app-wide letter shortcuts (which only bind ? / f a w s p v): the
  // arrows page through the deck, Space flips the card (unless a button is
  // focused, so it keeps activating that button natively), and 1 / 2 rate.
  useEffect(() => {
    if (seed == null) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prev();
          break;
        case '1':
          e.preventDefault();
          rate('skipped');
          break;
        case '2':
          e.preventDefault();
          rate('done');
          break;
        case ' ': {
          // A focused button (close, rate, nav…) should activate natively;
          // only intercept Space when focus isn't on one, to flip the card.
          const ae = document.activeElement;
          if (ae instanceof HTMLElement && ae.tagName === 'BUTTON') return;
          e.preventDefault();
          setFlipped((f) => !f);
          break;
        }
        default:
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [seed, next, prev, rate, setFlipped]);

  if (seed == null) {
    return (
      <StudySetup
        tree={tree}
        filter={filter}
        setFilter={setFilter}
        deckCount={deckCount}
        cta="Start flashcards"
        ctaIcon={Shuffle}
        onStart={start}
        intro={
          <>
            Flip through techniques one at a time. The front shows the title and
            phase; flip to reveal the summary, MITRE&nbsp;ATT&amp;CK id and tags.
            Rate each card &mdash; <strong className="text-fg">Knew it</strong>{' '}
            marks the technique done, <strong className="text-fg">Review</strong>{' '}
            marks it for later. Ratings sync with your progress.
          </>
        }
      />
    );
  }

  const card = cards[index];
  if (!card) {
    return (
      <div className="p-6 text-center text-sm text-fg-muted">
        No cards in this deck.
      </div>
    );
  }

  const atLast = index === cards.length - 1;

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Progress strip */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSeed(null)}
          className="flex min-h-[44px] items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-3 w-3" />
          deck setup
        </button>
        <span className="font-mono text-xs tabular-nums text-fg-secondary">
          {index + 1} / {cards.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={cards.length}
        aria-label={`Card ${index + 1} of ${cards.length}`}
        className="h-1 w-full overflow-hidden rounded-pill bg-canvas"
      >
        <div
          className="h-full rounded-pill bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-300"
          style={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Show technique front' : 'Reveal answer'}
        className="group relative min-h-[260px] w-full rounded-card border border-subtle bg-elevated/50 p-6 text-left transition-colors hover:border-accent/40"
      >
        <AnimatePresence mode="wait">
          {!flipped ? (
            <motion.div
              key="front"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex h-full flex-col"
            >
              <div className="mb-3 flex items-center gap-2">
                <SeverityBadge severity={card.severity} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                  {card.phaseTitle}
                </span>
              </div>
              <h3 className="text-xl font-semibold leading-snug text-fg">
                {card.title}
              </h3>
              <p className="mt-auto pt-6 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                tap to flip
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex h-full flex-col gap-3"
            >
              <p className="text-sm leading-relaxed text-fg">{card.summary}</p>
              <div className="flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={card.difficulty} />
                {card.mitreId && (
                  <span className="rounded-pill border border-accent-alt/40 bg-accent-alt-dim px-2 py-0.5 font-mono text-[10px] text-accent-alt">
                    {card.mitreId}
                  </span>
                )}
              </div>
              {card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {card.tags.slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className="rounded-pill bg-canvas px-2 py-0.5 font-mono text-[10px] text-fg-muted"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  goToNode(card.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    goToNode(card.id);
                  }
                }}
                className="mt-auto inline-flex w-fit cursor-pointer items-center gap-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:text-accent"
              >
                open full technique
                <ArrowRight className="h-3 w-3" />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => rate('skipped')}
          className="flex h-12 items-center justify-center gap-2 rounded-card border border-hairline text-sm text-fg-secondary transition-colors hover:border-fg-muted hover:text-fg"
        >
          <RotateCcw className="h-4 w-4" />
          Review later
        </button>
        <button
          type="button"
          onClick={() => rate('done')}
          className="flex h-12 items-center justify-center gap-2 rounded-card border border-severity-low/40 bg-severity-low/10 text-sm font-medium text-severity-low transition-colors hover:bg-severity-low/15"
        >
          <Check className="h-4 w-4" />
          Knew it
        </button>
      </div>

      {/* Prev / next */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className="flex min-h-[44px] items-center gap-1.5 rounded-pill border border-hairline px-3 text-xs text-fg-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        {atLast ? (
          <button
            type="button"
            onClick={() => setSeed(null)}
            className="flex min-h-[44px] items-center gap-1.5 rounded-pill border border-accent/40 bg-accent/5 px-3 text-xs text-accent transition-colors hover:bg-accent/10"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Finish deck
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="flex min-h-[44px] items-center gap-1.5 rounded-pill border border-hairline px-3 text-xs text-fg-secondary transition-colors hover:border-accent hover:text-accent"
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Keyboard hints — desktop only (no physical keyboard on touch) */}
      <div className="hidden flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 font-mono text-[10px] text-fg-muted sm:flex">
        <KbdHint keys={['←', '→']} label="prev / next" />
        <KbdHint keys={['space']} label="flip" />
        <KbdHint keys={['1']} label="review" />
        <KbdHint keys={['2']} label="knew it" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

function QuizRunner({
  tree,
  filter,
  setFilter,
  onClose,
}: {
  tree: Methodology;
  filter: DeckFilter;
  setFilter: (f: DeckFilter) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const selectNode = useMethodologyStore((s) => s.selectNode);
  const recordQuizResult = useMethodologyStore((s) => s.recordQuizResult);

  const scopeKey = useMemo(() => quizScopeKey(filter), [filter]);
  const record = useMethodologyStore(selectQuizRecord(scopeKey));

  const [seed, setSeed] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  // Outcome captured the moment a quiz is recorded, so the results screen can
  // celebrate a new best (or show the standing best) without re-recording.
  const [outcome, setOutcome] = useState<{
    isBest: boolean;
    previousBest: number | null;
  } | null>(null);

  const deckCount = useMemo(
    () => selectDeckNodes(tree, filter).length,
    [tree, filter],
  );

  const questions: QuizQuestion[] = useMemo(
    () => (seed == null ? [] : buildQuiz(tree, filter, QUIZ_SIZE, seed)),
    [tree, filter, seed],
  );

  // Record the completed quiz exactly once when the session finishes.
  useEffect(() => {
    if (!finished || questions.length === 0 || outcome !== null) return;
    const result = scoreQuiz(questions, answers);
    setOutcome(recordQuizResult(scopeKey, result.pct));
  }, [finished, questions, answers, outcome, scopeKey, recordQuizResult]);

  const start = () => {
    setSeed(seedFromString(`quiz-${filter.phaseId ?? 'all'}-${filter.difficulties.join(',')}-${Date.now()}`));
    setIndex(0);
    setAnswers({});
    setRevealed(false);
    setFinished(false);
    setOutcome(null);
  };

  const reset = () => {
    setSeed(null);
    setIndex(0);
    setAnswers({});
    setRevealed(false);
    setFinished(false);
    setOutcome(null);
  };

  const choose = useCallback(
    (key: string) => {
      if (revealed) return;
      setAnswers((a) => ({ ...a, [index]: key }));
      setRevealed(true);
    },
    [revealed, index],
  );

  const advance = useCallback(() => {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      setRevealed(false);
    } else {
      setFinished(true);
    }
  }, [index, questions.length]);

  const goToNode = (id: string) => {
    onClose();
    selectNode(id);
    router.push(`/node/${encodeURIComponent(id)}`);
  };

  // Keyboard answering while a quiz question is on screen: digits 1–9 pick the
  // matching option, then → advances. Digits and arrows never collide with the
  // app-wide letter shortcuts, and never trigger a focused button's activation.
  useEffect(() => {
    if (seed == null || finished || questions.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const current = questions[index];
      if (!current) return;
      if (!revealed) {
        if (/^[1-9]$/.test(e.key)) {
          const choice = current.choices[Number(e.key) - 1];
          if (choice) {
            e.preventDefault();
            choose(choice.key);
          }
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        advance();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [seed, finished, questions, index, revealed, choose, advance]);

  // Setup screen
  if (seed == null) {
    return (
      <StudySetup
        tree={tree}
        filter={filter}
        setFilter={setFilter}
        deckCount={deckCount}
        cta="Start quiz"
        ctaIcon={Brain}
        onStart={start}
        scopeStat={
          record ? (
            <div className="flex items-center justify-between gap-3 rounded-card border border-hairline bg-elevated/40 px-3.5 py-2.5">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
                <Target className="h-3.5 w-3.5 text-accent" />
                best to beat
              </span>
              <span className="flex items-center gap-2.5 text-sm">
                <span className="font-mono font-semibold tabular-nums text-fg">
                  {record.bestPct}%
                </span>
                <span className="font-mono text-[10px] text-fg-muted">
                  {record.attempts}{' '}
                  {record.attempts === 1 ? 'attempt' : 'attempts'}
                </span>
              </span>
            </div>
          ) : null
        }
        intro={
          <>
            A {QUIZ_SIZE}-question multiple-choice quiz generated from your
            scoped techniques. Questions cover which phase a technique lives in,
            its MITRE&nbsp;ATT&amp;CK mapping, and matching descriptions to
            techniques. You&apos;ll see the correct answer immediately and a
            scored summary at the end.
          </>
        }
      />
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <Brain className="h-8 w-8 text-fg-muted" />
        <p className="text-sm text-fg-secondary">
          Not enough cards in this scope to build a quiz.
        </p>
        <button
          type="button"
          onClick={reset}
          className="flex min-h-[44px] items-center gap-1.5 rounded-pill border border-hairline px-4 text-xs text-fg-secondary transition-colors hover:border-accent hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to setup
        </button>
      </div>
    );
  }

  // Results screen
  if (finished) {
    const result = scoreQuiz(questions, answers);
    const missed = result.missedNodeIds
      .map((id) => tree.nodes.find((n) => n.id === id))
      .filter((n): n is NonNullable<typeof n> => n != null);

    return (
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col items-center gap-3 rounded-card border border-hairline bg-elevated/60 px-4 py-8 text-center">
          <Trophy
            className={cn(
              'h-10 w-10',
              result.pct >= 80
                ? 'text-severity-low'
                : result.pct >= 50
                  ? 'text-severity-medium'
                  : 'text-severity-high',
            )}
          />
          <p className="font-mono text-4xl font-bold tabular-nums text-fg">
            {result.pct}%
          </p>
          <p className="text-sm text-fg-secondary">
            {result.correct} of {result.total} correct
          </p>
          {outcome &&
            (outcome.isBest ? (
              <p className="flex items-center gap-1.5 rounded-pill border border-accent/30 bg-accent/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
                <PartyPopper className="h-3.5 w-3.5" />
                {outcome.previousBest == null
                  ? 'first run on this scope'
                  : `new personal best · was ${outcome.previousBest}%`}
              </p>
            ) : (
              outcome.previousBest != null && (
                <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                  <Target className="h-3.5 w-3.5" />
                  best {outcome.previousBest}%
                </p>
              )
            ))}
        </div>

        {missed.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
              <ListChecks className="h-3.5 w-3.5" />
              Review these
            </p>
            <ul className="space-y-1.5">
              {missed.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => goToNode(n.id)}
                    className="group flex w-full items-center gap-2.5 rounded-input border border-hairline bg-elevated/50 px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-elevated"
                  >
                    <SeverityBadge severity={n.severity} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm text-fg group-hover:text-accent">
                      {n.title}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex h-12 items-center justify-center gap-2 rounded-card border border-hairline text-sm text-fg-secondary transition-colors hover:border-accent hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            New scope
          </button>
          <button
            type="button"
            onClick={start}
            className="flex h-12 items-center justify-center gap-2 rounded-card border border-accent/30 bg-accent/5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Active question
  const q = questions[index];
  const chosen = answers[index];
  if (!q) {
    return (
      <div className="p-6 text-center text-sm text-fg-muted">
        Question unavailable.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={reset}
          className="flex min-h-[44px] items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-3 w-3" />
          quiz setup
        </button>
        <span className="font-mono text-xs tabular-nums text-fg-secondary">
          {index + 1} / {questions.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-label={`Question ${index + 1} of ${questions.length}`}
        className="h-1 w-full overflow-hidden rounded-pill bg-canvas"
      >
        <div
          className="h-full rounded-pill bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-300"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div>
        <h3 className="text-base font-medium leading-snug text-fg">{q.prompt}</h3>
        {q.context && (
          <p className="mt-2 rounded-input border border-hairline bg-elevated/40 px-3 py-2 text-sm text-fg-secondary">
            {q.kind === 'mitre' || q.kind === 'phase' ? (
              <span className="font-medium text-fg">{q.context}</span>
            ) : (
              q.context
            )}
          </p>
        )}
      </div>

      <ul className="space-y-2" role="listbox" aria-label="Answer choices">
        {q.choices.map((choice, ci) => {
          const isCorrect = choice.key === q.correctKey;
          const isChosen = choice.key === chosen;
          const state = !revealed
            ? 'idle'
            : isCorrect
              ? 'correct'
              : isChosen
                ? 'wrong'
                : 'idle';
          return (
            <li key={choice.key}>
              <button
                type="button"
                onClick={() => choose(choice.key)}
                disabled={revealed}
                aria-pressed={isChosen}
                className={cn(
                  'flex min-h-[44px] w-full items-center gap-3 rounded-input border px-3 py-2.5 text-left text-sm transition-colors',
                  state === 'idle' &&
                    'border-hairline bg-elevated/50 text-fg hover:border-accent/40 hover:bg-elevated disabled:hover:border-hairline disabled:hover:bg-elevated/50',
                  state === 'correct' &&
                    'border-severity-low/50 bg-severity-low/10 text-severity-low',
                  state === 'wrong' &&
                    'border-severity-critical/50 bg-severity-critical/10 text-severity-critical',
                )}
              >
                {/* Answer-key hint — desktop only; mirrors the 1–9 shortcut. */}
                {ci < 9 && (
                  <kbd
                    aria-hidden
                    className={cn(
                      'hidden h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] sm:flex',
                      state === 'idle'
                        ? 'border-hairline bg-canvas text-fg-muted'
                        : 'border-transparent bg-transparent text-current opacity-60',
                    )}
                  >
                    {ci + 1}
                  </kbd>
                )}
                <span className="min-w-0 flex-1">{choice.label}</span>
                {state === 'correct' && <Check className="h-4 w-4 shrink-0" />}
                {state === 'wrong' && <X className="h-4 w-4 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goToNode(q.nodeId)}
            className="flex min-h-[44px] items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:text-accent"
          >
            open technique
            <ArrowRight className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={advance}
            className="flex h-11 items-center gap-2 rounded-pill border border-accent/40 bg-accent/5 px-5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
          >
            {index === questions.length - 1 ? 'See results' : 'Next'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Keyboard hint — desktop only (no physical keyboard on touch) */}
      <div className="hidden items-center justify-center pt-1 font-mono text-[10px] text-fg-muted sm:flex">
        {revealed ? (
          <KbdHint keys={['→']} label="next" />
        ) : (
          <KbdHint keys={['1-9']} label="choose an answer" />
        )}
      </div>
    </div>
  );
}
