import { useCallback, useEffect, useMemo, useState } from 'react';

import { sampleFigure } from '@/data/sampleFigure';
import { CropStage } from '@/features/game/CropStage';
import { matches } from '@/lib/matching';
import { scoreGuess } from '@/lib/scoring';
import {
  loadNumber,
  loadString,
  loadStringSet,
  saveNumber,
  saveStringSet,
} from '@/lib/storage';
import { useFigures } from '@/lib/useFigures';
import type { Screen } from '@/components/ProtoNav';
import type { Difficulty, Figure } from '@/types/figure';
import type { HintType } from '@/types/hint';

type GameScreenProps = { goTo: (s: Screen) => void };

type Feedback = {
  kind: 'neutral' | 'success' | 'error' | 'reveal';
  text: string;
  sub?: string;
};

type Outcome = 'playing' | 'won' | 'lost';

const HINTS: ReadonlyArray<{ key: HintType; name: string; cost: number; icon: string }> = [
  { key: 'era', name: 'Era', cost: 5, icon: 'E' },
  { key: 'field', name: 'Field', cost: 10, icon: 'F' },
  { key: 'region', name: 'Region', cost: 10, icon: 'R' },
  { key: 'letter', name: 'Initial', cost: 15, icon: 'A' },
];

const NEUTRAL_FEEDBACK: Feedback = {
  kind: 'neutral',
  text: 'Start with a tight crop for max points.',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

function loadDifficulty(): Difficulty {
  const v = loadString('difficulty');
  if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  return 'easy';
}

function hintValue(figure: Figure, key: HintType): string {
  switch (key) {
    case 'era':
      return figure.era;
    case 'field':
      return figure.field;
    case 'region':
      return figure.region;
    case 'letter':
      return figure.first_letter;
  }
}

function pickRandom<T>(pool: T[]): T | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function selectNextFigure(
  pool: Figure[],
  difficulty: Difficulty,
  seen: Set<string>,
  excludeId: string | null,
): Figure | null {
  const filteredByDifficulty = pool.filter((f) => f.difficulty === difficulty);
  const fresh = filteredByDifficulty.filter((f) => !seen.has(f.id) && f.id !== excludeId);
  if (fresh.length > 0) return pickRandom(fresh);
  const sameDiff = filteredByDifficulty.filter((f) => f.id !== excludeId);
  if (sameDiff.length > 0) return pickRandom(sameDiff);
  const anyOther = pool.filter((f) => f.id !== excludeId);
  if (anyOther.length > 0) return pickRandom(anyOther);
  return pickRandom(pool);
}

export function GameScreen({ goTo }: GameScreenProps) {
  const { figures, loading, error } = useFigures();

  const [difficulty] = useState<Difficulty>(loadDifficulty);
  const [figure, setFigure] = useState<Figure | null>(null);
  const [reveal, setReveal] = useState(10);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(NEUTRAL_FEEDBACK);
  const [usedHints, setUsedHints] = useState<HintType[]>([]);
  const [score, setScore] = useState(() => loadNumber('score', 0));
  const [streak, setStreak] = useState(() => loadNumber('streak', 0));
  const [round, setRound] = useState(() => loadNumber('round', 0));
  const [seenIds, setSeenIds] = useState<Set<string>>(() => loadStringSet('seen'));
  const [outcome, setOutcome] = useState<Outcome>('playing');
  const [pulse, setPulse] = useState(false);

  const pickFigure = useCallback(() => {
    const next = selectNextFigure(figures, difficulty, seenIds, figure?.id ?? null);
    if (!next) return;
    setFigure(next);
    setReveal(10);
    setGuess('');
    setFeedback(NEUTRAL_FEEDBACK);
    setUsedHints([]);
    setOutcome('playing');
    setRound((r) => {
      const nextRound = r + 1;
      saveNumber('round', nextRound);
      return nextRound;
    });
  }, [figures, difficulty, seenIds, figure?.id]);

  useEffect(() => {
    if (!figure && figures.length > 0) {
      pickFigure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figures]);

  const markSeen = (id: string) => {
    setSeenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      if (next.size >= figures.length && figures.length > 0) {
        saveStringSet('seen', new Set());
        return new Set();
      }
      saveStringSet('seen', next);
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!figure || outcome !== 'playing') return;
    const trimmed = guess.trim();
    if (!trimmed) return;
    if (matches(trimmed, [figure.name, ...figure.aliases])) {
      const earned = scoreGuess(reveal, usedHints);
      const nextScore = score + earned;
      const nextStreak = streak + 1;
      setScore(nextScore);
      setStreak(nextStreak);
      saveNumber('score', nextScore);
      saveNumber('streak', nextStreak);
      setOutcome('won');
      setFeedback({
        kind: 'success',
        text: `Correct! That's ${figure.name}. +${earned} points.`,
      });
      markSeen(figure.id);
      setPulse(true);
      setTimeout(() => setPulse(false), 1300);
    } else {
      setStreak(0);
      saveNumber('streak', 0);
      setFeedback({
        kind: 'error',
        text: 'Not quite — try revealing more, or use a hint.',
      });
    }
  };

  const useHint = (key: HintType, cost: number) => {
    if (outcome !== 'playing' || !figure) return;
    if (usedHints.includes(key)) return;
    setUsedHints((prev) => [...prev, key]);
    const nextScore = Math.max(0, score - cost);
    setScore(nextScore);
    saveNumber('score', nextScore);
  };

  const giveUp = () => {
    if (!figure || outcome !== 'playing') return;
    setStreak(0);
    saveNumber('streak', 0);
    setOutcome('lost');
    const metaParts = [figure.era, figure.field, figure.region].filter(Boolean);
    setFeedback({
      kind: 'reveal',
      text: `It was ${figure.name}.`,
      sub: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
    markSeen(figure.id);
  };

  const next = () => {
    pickFigure();
  };

  const activeFigure = figure ?? sampleFigure;
  const visualReveal = outcome === 'playing' ? reveal : 100;
  const potential = scoreGuess(reveal, usedHints);

  const headerNumeral = useMemo(
    () => `№ ${String(round).padStart(3, '0')}`,
    [round],
  );

  return (
    <RoundChrome
      mode="practice"
      headerNumeral={headerNumeral}
      headerLabel="Practice"
      subtitleLeft={`Round ${round || 1}`}
      hintsUsedCount={usedHints.length}
      difficulty={difficulty}
      onChangeDifficulty={() => goTo('play-setup')}
      goHome={() => goTo('landing')}
      loading={loading && !figure}
      error={error && !figure ? error : null}
      empty={!loading && !error && figures.length === 0}
      figure={activeFigure}
      reveal={reveal}
      visualReveal={visualReveal}
      onReveal={(v) => {
        if (v > reveal) setReveal(v);
      }}
      potential={potential}
      score={score}
      streak={streak}
      outcome={outcome}
      pulse={pulse}
      guess={guess}
      onGuess={setGuess}
      onSubmit={submit}
      feedback={feedback}
      usedHints={usedHints}
      onUseHint={useHint}
      onGiveUp={giveUp}
      onNext={next}
      footMeta={null}
    />
  );
}

// =========================================================================
// Round chrome — shared layout for Practice and Challenge. The container is
// single-column on mobile (≤ md) with stat pills overlaying the stage; on
// desktop it's a two-column grid (stage left, dossier right) per the
// PFH Redesign hand-off.
// =========================================================================

export type RoundChromeProps = {
  mode: 'practice' | 'challenge';
  headerNumeral: string;
  headerLabel: string;
  subtitleLeft: string;
  hintsUsedCount: number;
  difficulty: Difficulty;
  onChangeDifficulty: () => void;
  goHome: () => void;
  loading: boolean;
  error: Error | null;
  empty: boolean;
  figure: Figure;
  reveal: number;
  visualReveal: number;
  onReveal: (v: number) => void;
  potential: number;
  score: number;
  streak: number;
  outcome: Outcome;
  pulse: boolean;
  guess: string;
  onGuess: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  feedback: Feedback;
  usedHints: HintType[];
  onUseHint: (key: HintType, cost: number) => void;
  onGiveUp: () => void;
  onNext: () => void;
  footMeta: string | null;
  // Mode-specific labels and optional slots
  scoreLabel?: string;     // defaults "Score" — Challenge uses "Total"
  streakLabel?: string;    // defaults "Streak" — Challenge uses "Tier streak"
  nextLabel?: string;      // defaults "Next figure" — Challenge final round uses "See results"
  topInsert?: React.ReactNode; // optional element rendered below top bar, above body (e.g. ProgressDots)
};

export function RoundChrome(props: RoundChromeProps) {
  const {
    loading,
    error,
    empty,
    figure,
    visualReveal,
    potential,
    score,
    streak,
    pulse,
    scoreLabel = 'Score',
    streakLabel = 'Streak',
    nextLabel = 'Next figure',
    topInsert,
  } = props;

  const stageContent = loading ? (
    <LoadingPlaceholder />
  ) : error ? (
    <ErrorPlaceholder error={error} />
  ) : empty ? (
    <EmptyPlaceholder />
  ) : (
    <div className="relative">
      <CropStage
        key={figure.id}
        imageUrl={figure.image_url ?? sampleFigure.image_url}
        focal={{ x: figure.focal_x, y: figure.focal_y }}
        startSize={figure.start_size}
        revealPct={visualReveal}
      />
      {/* Mobile-only pill overlays */}
      <div className="absolute left-3 top-3 md:hidden">
        <PillStat label="Revealed" value={`${visualReveal}%`} />
      </div>
      <div className="absolute right-3 top-3 md:hidden">
        <PillStat label="Potential" value={String(potential)} tone="ink" />
      </div>
      <div className="absolute bottom-3 left-3 md:hidden">
        <PillStat label={scoreLabel} value={String(score)} tone="amber" extra={`· ${streakLabel} ${streak}`} pulse={pulse} />
      </div>
    </div>
  );

  return (
    <>
      <MobileTree {...props} stageContent={stageContent} />
      <DesktopTree
        {...props}
        scoreLabel={scoreLabel}
        streakLabel={streakLabel}
        nextLabel={nextLabel}
        topInsert={topInsert}
        stageContent={stageContent}
      />
    </>
  );
}

// =========================================================================
// Mobile (≤ md) — no-scroll flex column. Stage takes remaining space;
// guess input + give-up dock at the bottom; hints compact to pill chips.
// =========================================================================

function MobileTree(
  props: RoundChromeProps & { stageContent: React.ReactNode },
) {
  const {
    headerNumeral,
    headerLabel,
    difficulty,
    onChangeDifficulty,
    goHome,
    figure,
    reveal,
    visualReveal,
    onReveal,
    outcome,
    guess,
    onGuess,
    onSubmit,
    feedback,
    usedHints,
    onUseHint,
    onGiveUp,
    onNext,
    footMeta,
    nextLabel = 'Next figure',
    topInsert,
    stageContent,
  } = props;

  return (
    <div className="flex h-[calc(100svh-41px)] flex-col bg-(--color-bg) md:hidden">
      {/* Top bar */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-(--color-rule) px-4 py-2.5">
        <button
          onClick={goHome}
          aria-label="Home"
          className="inline-flex h-9 w-9 items-center justify-center text-(--color-body)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="inline-flex gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
          <span>{headerNumeral}</span>
          <span>·</span>
          <span>{headerLabel}</span>
        </div>
        <button
          onClick={onChangeDifficulty}
          className="inline-flex items-center gap-1 rounded-full border border-(--color-hairline) bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-body)"
        >
          {DIFFICULTY_LABEL[difficulty]}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Optional top insert — Challenge progress dots */}
      {topInsert && (
        <div className="flex-shrink-0 border-b border-(--color-rule) px-4 py-2">
          {topInsert}
        </div>
      )}

      {/* Stage — natural square at full width */}
      <div className="flex flex-shrink-0 items-center justify-center px-3 pt-3">
        <div className="w-full max-w-[440px]">{stageContent}</div>
      </div>

      {/* Slider (compact) */}
      <div className="mt-3 flex flex-shrink-0 items-center gap-3 px-4">
        <input
          type="range"
          className="pfh-slider flex-1"
          min={10}
          max={100}
          value={visualReveal}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v > reveal) {
              onReveal(v);
            } else {
              e.currentTarget.value = String(reveal);
            }
          }}
          disabled={outcome !== 'playing' || !figure}
          aria-label="Reveal amount"
          style={{ ['--reveal-pct' as string]: `${visualReveal}%` }}
        />
        <span
          className="min-w-10 text-right tabular-nums"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-ink)',
          }}
        >
          {visualReveal}%
        </span>
      </div>

      {/* Hint chips */}
      <div className="flex flex-shrink-0 flex-wrap gap-1.5 px-4 py-2.5">
        {HINTS.map((h) => (
          <MobileHintChip
            key={h.key}
            hint={h}
            value={hintValue(figure, h.key)}
            used={usedHints.includes(h.key)}
            disabled={outcome !== 'playing' || !figure}
            onUse={() => onUseHint(h.key, h.cost)}
          />
        ))}
      </div>

      {/* Spacer — absorbs any extra vertical space on taller phones */}
      <div className="min-h-0 flex-1" />

      {/* Bottom action area */}
      <div
        className="flex-shrink-0 border-t border-(--color-rule) bg-white px-4 pt-3"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {feedback.kind !== 'neutral' && <CompactFeedback feedback={feedback} />}

        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Who is this person?"
            value={guess}
            onChange={(e) => onGuess(e.target.value)}
            disabled={outcome !== 'playing' || !figure}
            className="min-h-12 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-3 text-base text-(--color-ink) placeholder:text-(--color-muted) focus:border-(--color-amber) focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F4F2] disabled:text-(--color-muted)"
          />
          <button
            type="submit"
            disabled={outcome !== 'playing' || !figure}
            className="inline-flex min-h-12 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-5 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guess
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between gap-2">
          {outcome === 'playing' ? (
            <button
              onClick={onGiveUp}
              disabled={!figure}
              className="inline-flex min-h-10 items-center justify-center rounded-button border border-(--color-hairline-strong) bg-transparent px-4 py-2 text-sm font-medium text-(--color-body) disabled:cursor-not-allowed disabled:opacity-50"
            >
              Give up &amp; reveal
            </button>
          ) : (
            <button
              onClick={onNext}
              className="inline-flex min-h-10 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-5 py-2 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            >
              {nextLabel}
            </button>
          )}
          {footMeta && (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
              {footMeta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileHintChip({
  hint,
  value,
  used,
  disabled,
  onUse,
}: {
  hint: { key: HintType; name: string; cost: number; icon: string };
  value: string;
  used: boolean;
  disabled: boolean;
  onUse: () => void;
}) {
  return (
    <button
      onClick={onUse}
      disabled={disabled || used}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] transition-colors duration-150 ' +
        (used
          ? 'border-(--color-amber) bg-(--color-amber-soft) text-(--color-amber)'
          : 'border-(--color-hairline) bg-white text-(--color-body)') +
        (disabled && !used ? ' opacity-50' : '')
      }
    >
      <span
        className={
          'inline-grid h-4 w-4 place-items-center rounded text-[9px] font-semibold ' +
          (used ? 'bg-(--color-amber) text-white' : 'bg-(--color-amber-soft) text-(--color-amber)')
        }
      >
        {hint.icon}
      </span>
      {used ? (
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          {value || '—'}
        </span>
      ) : (
        <span className="font-mono text-[10px] text-(--color-muted)">−{hint.cost}</span>
      )}
    </button>
  );
}

function CompactFeedback({ feedback }: { feedback: Feedback }) {
  const classes: Record<Feedback['kind'], string> = {
    neutral: 'border-(--color-hairline) bg-white text-(--color-muted)',
    error: 'border-(--color-error-border) bg-(--color-error-bg) text-(--color-error)',
    success: 'border-(--color-success-border) bg-(--color-success-bg) text-(--color-success)',
    reveal: 'border-(--color-info-border) bg-(--color-info-bg) text-(--color-info)',
  };
  return (
    <div
      className={
        'mb-2.5 rounded-button border px-3 py-2 text-xs leading-[1.4] ' + classes[feedback.kind]
      }
    >
      <div>{feedback.text}</div>
      {feedback.sub && <div className="mt-0.5 opacity-80">{feedback.sub}</div>}
    </div>
  );
}

// =========================================================================
// Desktop (≥ md) — preserves the two-column dossier from the redesign.
// =========================================================================

function DesktopTree(
  props: RoundChromeProps & {
    stageContent: React.ReactNode;
    scoreLabel: string;
    streakLabel: string;
    nextLabel: string;
    topInsert: React.ReactNode;
  },
) {
  const {
    headerNumeral,
    headerLabel,
    subtitleLeft,
    hintsUsedCount,
    difficulty,
    onChangeDifficulty,
    goHome,
    figure,
    reveal,
    visualReveal,
    onReveal,
    potential,
    score,
    streak,
    outcome,
    pulse,
    guess,
    onGuess,
    onSubmit,
    feedback,
    usedHints,
    onUseHint,
    onGiveUp,
    onNext,
    footMeta,
    scoreLabel,
    streakLabel,
    nextLabel,
    topInsert,
    stageContent,
  } = props;

  return (
    <div className="hidden h-[calc(100vh-41px)] overflow-y-auto bg-(--color-bg) md:block">
      <div className="mx-auto max-w-[1040px]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pb-3 pt-6">
          <button
            onClick={goHome}
            className="inline-flex items-center gap-1.5 text-sm text-(--color-body) no-underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Home
          </button>
          <div className="inline-flex gap-3.5 font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
            <span>{headerNumeral}</span>
            <span className="hidden md:inline">·</span>
            <span>{headerLabel}</span>
          </div>
          <button
            onClick={onChangeDifficulty}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-body) hover:text-(--color-ink)"
          >
            {DIFFICULTY_LABEL[difficulty]}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        <div className="border-t border-(--color-rule)" />

        {topInsert && <div className="px-5 pt-4 md:px-8">{topInsert}</div>}

        {/* Body grid */}
        <div className="md:grid md:grid-cols-[1.25fr_1fr] md:gap-0">
          {/* Left zone: title + stage + slider */}
          <div className="px-5 pb-2 pt-5 md:border-r md:border-(--color-rule) md:px-8 md:pb-7 md:pt-7">
            <h2
              className="leading-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 30,
                fontWeight: 500,
                color: 'var(--color-ink)',
                letterSpacing: '-0.015em',
              }}
            >
              People from{' '}
              <em className="font-normal italic text-(--color-amber)">History</em>
            </h2>
            <div className="mt-1.5 text-sm text-(--color-muted)">
              <span className="font-medium text-(--color-ink)">{subtitleLeft}</span>
              {' · '}
              {hintsUsedCount === 0 ? 'No hints used' : `${hintsUsedCount} hint${hintsUsedCount === 1 ? '' : 's'} used`}
            </div>

            <div className="mt-5">{stageContent}</div>

            <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">Reveal</span>
              <input
                type="range"
                className="pfh-slider"
                min={10}
                max={100}
                value={visualReveal}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v > reveal) {
                    onReveal(v);
                  } else {
                    e.currentTarget.value = String(reveal);
                  }
                }}
                disabled={outcome !== 'playing' || !figure}
                aria-label="Reveal amount"
                style={{ ['--reveal-pct' as string]: `${visualReveal}%` }}
              />
              <span
                className="min-w-12 text-right tabular-nums"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                }}
              >
                {visualReveal}%
              </span>
            </div>
            <div className="mt-2 text-xs text-(--color-muted)">
              Drag to see more. <span className="text-(--color-ink)">Each +1% costs 1 point</span> from your potential.
            </div>
          </div>

          {/* Right zone: dossier */}
          <div className="px-5 pb-7 pt-5 md:bg-(--color-paper) md:px-8 md:pt-7">
            {/* Desktop-only stats grid */}
            <div className="hidden md:block">
              <DossierHeader first>This round</DossierHeader>
              <div className="mb-6 grid grid-cols-3 gap-2.5">
                <StatTile label="Potential" value={`${potential}`} sub="/90" featured />
                <StatTile label={scoreLabel} value={`${score}`} pulse={pulse} />
                <StatTile label={streakLabel} value={`${streak}`} />
              </div>
            </div>

            <DossierHeader className="hidden md:block">Your guess</DossierHeader>
            <form onSubmit={onSubmit} className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Who is this person?"
                value={guess}
                onChange={(e) => onGuess(e.target.value)}
                disabled={outcome !== 'playing' || !figure}
                className="min-h-12 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-3 text-base text-(--color-ink) transition-colors duration-150 placeholder:text-(--color-muted) hover:border-(--color-hairline-strong) focus:border-(--color-amber) focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F4F2] disabled:text-(--color-muted) md:min-h-11"
              />
              <button
                type="submit"
                disabled={outcome !== 'playing' || !figure}
                className="inline-flex min-h-12 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover) disabled:cursor-not-allowed disabled:opacity-50 md:min-h-11"
              >
                Guess
              </button>
            </form>

            <FeedbackBox feedback={feedback} />

            <div className="mt-5 md:mt-6">
              <div className="mb-2 flex items-baseline justify-between">
                <DossierHeader className="!m-0">Hints</DossierHeader>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-muted)">
                  tap to unlock
                </span>
              </div>
              <HintsArea
                figure={figure}
                usedHints={usedHints}
                disabled={outcome !== 'playing' || !figure}
                onUse={onUseHint}
              />
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-(--color-rule) pt-4 md:mt-7">
              {outcome === 'playing' ? (
                <button
                  onClick={onGiveUp}
                  disabled={!figure}
                  className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-hairline-strong) bg-transparent px-5 py-2.5 text-sm font-medium text-(--color-body) transition-colors duration-150 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Give up &amp; reveal
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-5 py-2.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
                >
                  {nextLabel}
                </button>
              )}
              {footMeta && (
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
                  {footMeta}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== Subcomponents ======================================================

function PillStat({
  label,
  value,
  tone,
  extra,
  pulse,
}: {
  label: string;
  value: string;
  tone?: 'plain' | 'ink' | 'amber';
  extra?: string;
  pulse?: boolean;
}) {
  const palette =
    tone === 'ink'
      ? 'bg-(--color-ink)/95 text-white border-(--color-ink)'
      : tone === 'amber'
        ? 'bg-(--color-amber-soft)/95 border-(--color-amber-soft-2) text-[#6B4D14]'
        : 'bg-white/95 border-(--color-hairline) text-(--color-body)';
  const labelTone =
    tone === 'ink'
      ? 'text-white/55'
      : tone === 'amber'
        ? 'text-[#8B6519]'
        : 'text-(--color-muted)';
  return (
    <span
      className={
        'inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1.5 text-xs backdrop-blur-sm ' +
        palette
      }
    >
      <span className={'font-mono text-[10px] uppercase tracking-[0.08em] ' + labelTone}>
        {label}
      </span>
      <b
        className={pulse ? 'pfh-pulse' : ''}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {value}
      </b>
      {extra && <span className={'text-[10px] ' + labelTone}>{extra}</span>}
    </span>
  );
}

function DossierHeader({
  children,
  first,
  className,
}: {
  children: React.ReactNode;
  first?: boolean;
  className?: string;
}) {
  return (
    <h3
      className={
        'font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted) ' +
        (first ? 'mb-2.5' : 'mb-2.5 mt-6') +
        (className ? ' ' + className : '')
      }
    >
      {children}
    </h3>
  );
}

function StatTile({
  label,
  value,
  sub,
  featured,
  pulse,
}: {
  label: string;
  value: string;
  sub?: string;
  featured?: boolean;
  pulse?: boolean;
}) {
  return (
    <div
      className={
        'rounded-card border px-3.5 py-3 ' +
        (featured
          ? 'border-(--color-ink) bg-(--color-ink) text-white'
          : 'border-(--color-hairline) bg-white')
      }
    >
      <div
        className={
          'font-mono text-[10px] uppercase tracking-[0.1em] ' +
          (featured ? 'text-white/60' : 'text-(--color-muted)')
        }
      >
        {label}
      </div>
      <div
        className={'mt-0.5 leading-tight ' + (pulse && !featured ? 'pfh-pulse' : '')}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 600,
          color: featured ? '#fff' : (pulse ? 'var(--color-amber)' : 'var(--color-ink)'),
        }}
      >
        {value}
        {sub && (
          <span
            className={'ml-0.5 text-base font-normal ' + (featured ? 'text-white/45' : 'text-(--color-muted)')}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function HintsArea({
  figure,
  usedHints,
  disabled,
  onUse,
}: {
  figure: Figure;
  usedHints: HintType[];
  disabled: boolean;
  onUse: (key: HintType, cost: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
      {HINTS.map((h) => {
        const used = usedHints.includes(h.key);
        const value = hintValue(figure, h.key);
        return (
          <button
            key={h.key}
            onClick={() => onUse(h.key, h.cost)}
            disabled={disabled || used}
            className={
              'group flex w-full items-start gap-3 rounded-card border px-3 py-2.5 text-left transition-colors duration-150 ' +
              (used
                ? 'border-transparent bg-(--color-paper-2) cursor-default'
                : 'border-(--color-hairline) bg-white hover:border-(--color-hairline-strong) ' +
                  (disabled ? ' opacity-50 cursor-not-allowed' : ''))
            }
          >
            <span
              className={
                'grid h-6 w-6 flex-shrink-0 place-items-center rounded text-xs font-semibold ' +
                (used
                  ? 'bg-(--color-ink) text-white'
                  : 'bg-(--color-amber-soft) text-(--color-amber)')
              }
            >
              {h.icon}
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-medium text-(--color-ink)">
                {h.name}
              </span>
              {used ? (
                <span
                  className="mt-0.5 block text-sm italic"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
                >
                  {value || '—'}
                </span>
              ) : (
                <span className="mt-0.5 block font-mono text-[10px] tracking-[0.04em] text-(--color-muted)">
                  −{h.cost} pts
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FeedbackBox({ feedback }: { feedback: Feedback }) {
  const classes: Record<Feedback['kind'], string> = {
    neutral: 'border-(--color-hairline) bg-white text-(--color-muted)',
    error: 'border-(--color-error-border) bg-(--color-error-bg) text-(--color-error)',
    success: 'border-(--color-success-border) bg-(--color-success-bg) text-(--color-success)',
    reveal: 'border-(--color-info-border) bg-(--color-info-bg) text-(--color-info)',
  };
  return (
    <div
      className={
        'flex min-h-12 flex-col justify-center rounded-card border px-4 py-3 text-sm leading-[1.45] transition-colors duration-200 ' +
        classes[feedback.kind]
      }
    >
      <div>{feedback.text}</div>
      {feedback.sub && <div className="mt-1 text-xs opacity-80">{feedback.sub}</div>}
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-card border border-(--color-hairline) bg-(--color-paper) text-center">
      <div className="absolute inset-0 grid place-items-center text-sm text-(--color-muted)">
        Loading figures…
      </div>
    </div>
  );
}

function ErrorPlaceholder({ error }: { error: Error }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-card border border-(--color-error-border) bg-(--color-error-bg) text-center">
      <div className="absolute inset-0 grid place-items-center px-6 text-sm text-(--color-error)">
        Couldn't load figures.
        <br />
        {error.message}
      </div>
    </div>
  );
}

function EmptyPlaceholder() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-card border border-(--color-hairline) bg-(--color-paper) text-center">
      <div className="absolute inset-0 grid place-items-center px-6 text-sm text-(--color-muted)">
        No figures in the database yet. Add one in the Supabase dashboard, then refresh.
      </div>
    </div>
  );
}
