import { useCallback, useEffect, useState } from 'react';

import { sampleFigure } from '@/data/sampleFigure';
import { CropStage } from '@/features/game/CropStage';
import { matches } from '@/lib/matching';
import { scoreChallengeRound } from '@/lib/scoring';
import { saveString } from '@/lib/storage';
import { useFigures } from '@/lib/useFigures';
import type { Screen } from '@/components/ProtoNav';
import type { Difficulty, Figure } from '@/types/figure';
import type { HintType } from '@/types/hint';

type ChallengeScreenProps = { goTo: (s: Screen) => void };

type Feedback = {
  kind: 'neutral' | 'success' | 'error' | 'reveal';
  text: string;
  sub?: string;
};

type Outcome = 'playing' | 'won' | 'lost';

export type RoundResult = {
  figureId: string;
  figureName: string;
  difficulty: Difficulty;
  outcome: 'won' | 'lost';
  reveal: number;
  hintsUsed: HintType[];
  finalScore: number;
};

type Hint = { key: HintType; label: string; cost: number };

const HINTS: Hint[] = [
  { key: 'era', label: 'Era (-5)', cost: 5 },
  { key: 'field', label: 'Field (-10)', cost: 10 },
  { key: 'region', label: 'Region (-10)', cost: 10 },
  { key: 'letter', label: 'Letter (-15)', cost: 15 },
];

const NEUTRAL_FEEDBACK: Feedback = {
  kind: 'neutral',
  text: 'Start with a tight crop for max points.',
};

const TOTAL_ROUNDS = 10;
const STREAK_TO_BUMP = 2;

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

function nextTier(t: Difficulty): Difficulty {
  if (t === 'easy') return 'medium';
  if (t === 'medium') return 'hard';
  return 'hard';
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

function hintLabel(key: HintType): string {
  switch (key) {
    case 'era':
      return 'Era';
    case 'field':
      return 'Field';
    case 'region':
      return 'Region';
    case 'letter':
      return 'First letter';
  }
}

function pickRandom<T>(pool: T[]): T | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function selectFigure(
  pool: Figure[],
  tier: Difficulty,
  usedIds: ReadonlySet<string>,
): Figure | null {
  const sameTier = pool.filter((f) => f.difficulty === tier);
  const fresh = sameTier.filter((f) => !usedIds.has(f.id));
  if (fresh.length > 0) return pickRandom(fresh);
  // Fallback if we run out of un-used in tier (shouldn't happen at 10 rounds across 99 figures).
  if (sameTier.length > 0) return pickRandom(sameTier);
  return pickRandom(pool);
}

export function ChallengeScreen({ goTo }: ChallengeScreenProps) {
  const { figures, loading, error } = useFigures();

  // Run-level state (reset per challenge).
  const [results, setResults] = useState<RoundResult[]>([]);
  const [tier, setTier] = useState<Difficulty>('easy');
  const [tierStreak, setTierStreak] = useState(0);

  // Round-level state.
  const [figure, setFigure] = useState<Figure | null>(null);
  const [reveal, setReveal] = useState(10);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(NEUTRAL_FEEDBACK);
  const [usedHints, setUsedHints] = useState<HintType[]>([]);
  const [outcome, setOutcome] = useState<Outcome>('playing');
  const [pulse, setPulse] = useState(false);

  const usedFigureIds = new Set(results.map((r) => r.figureId));

  const pickFirstFigure = useCallback(() => {
    const picked = selectFigure(figures, 'easy', new Set());
    if (!picked) return;
    setFigure(picked);
  }, [figures]);

  useEffect(() => {
    if (!figure && figures.length > 0) pickFirstFigure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figures]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!figure || outcome !== 'playing') return;
    const trimmed = guess.trim();
    if (!trimmed) return;
    if (matches(trimmed, [figure.name, ...figure.aliases])) {
      const earned = scoreChallengeRound(reveal, usedHints, tier);
      setOutcome('won');
      // Don't call setReveal(100) — that would corrupt the recorded
      // reveal-at-guess-time. The CropStage + slider visually jump to
      // 100% via the conditional render below.
      setFeedback({
        kind: 'success',
        text: `Correct! That's ${figure.name}. +${earned} points.`,
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 1300);
    } else {
      setFeedback({
        kind: 'error',
        text: 'Not quite — try revealing more, or use a hint.',
      });
    }
  };

  const useHint = (key: HintType) => {
    if (outcome !== 'playing' || !figure) return;
    if (usedHints.includes(key)) return;
    setUsedHints((prev) => [...prev, key]);
  };

  const giveUp = () => {
    if (!figure || outcome !== 'playing') return;
    setOutcome('lost');
    // Don't call setReveal(100) — see submit() for why. Visual reveal is
    // overridden in the render when outcome !== 'playing'.
    const metaParts = [figure.era, figure.field, figure.region].filter(Boolean);
    setFeedback({
      kind: 'reveal',
      text: `It was ${figure.name}.`,
      sub: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
  };

  const advance = () => {
    if (!figure || outcome === 'playing') return;

    // Record this round's result.
    const finalScore = outcome === 'won' ? scoreChallengeRound(reveal, usedHints, tier) : 0;
    const result: RoundResult = {
      figureId: figure.id,
      figureName: figure.name,
      difficulty: tier,
      outcome,
      reveal,
      hintsUsed: usedHints,
      finalScore,
    };
    const newResults = [...results, result];

    // Final round → persist + jump to end screen.
    if (newResults.length >= TOTAL_ROUNDS) {
      const total = newResults.reduce((s, r) => s + r.finalScore, 0);
      saveString(
        'challenge:lastRun',
        JSON.stringify({
          results: newResults,
          total,
          finishedAt: new Date().toISOString(),
        }),
      );
      setResults(newResults);
      goTo('challenge-end');
      return;
    }

    // Otherwise, compute next tier and pick a fresh figure.
    let newTier = tier;
    let newStreak = tierStreak;
    if (outcome === 'won') {
      newStreak = tierStreak + 1;
      if (newStreak >= STREAK_TO_BUMP && tier !== 'hard') {
        newTier = nextTier(tier);
        newStreak = 0;
      }
    } else {
      newStreak = 0;
    }

    const nextUsed = new Set(usedFigureIds);
    nextUsed.add(figure.id);
    const nextFigure = selectFigure(figures, newTier, nextUsed);

    setResults(newResults);
    setTier(newTier);
    setTierStreak(newStreak);
    setFigure(nextFigure);
    setReveal(10);
    setGuess('');
    setFeedback(NEUTRAL_FEEDBACK);
    setUsedHints([]);
    setOutcome('playing');
  };

  const roundNumber = results.length + 1;
  const isLastRound = results.length === TOTAL_ROUNDS - 1;
  const activeFigure = figure ?? sampleFigure;

  // Visual reveal: pegged to 100% once the round has resolved so the player
  // sees the whole image, while the recorded `reveal` state stays at the
  // value at moment of outcome.
  const visualReveal = outcome === 'playing' ? reveal : 100;
  const pendingScore =
    outcome === 'won' && figure ? scoreChallengeRound(reveal, usedHints, tier) : 0;
  const runningTotal = results.reduce((s, r) => s + r.finalScore, 0) + pendingScore;

  return (
    <div className="h-[calc(100vh-41px)] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[480px] px-6 pb-24 pt-8">
        <div className="mb-7">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              goTo('landing');
            }}
            className="text-sm text-(--color-muted) no-underline"
          >
            ← Home
          </a>
        </div>

        <header className="mb-6">
          <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
            § Challenge · Round {String(roundNumber).padStart(2, '0')} / {TOTAL_ROUNDS}
          </div>
          <div
            className="leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 500,
              color: 'var(--color-ink)',
              letterSpacing: '-0.01em',
            }}
          >
            People from{' '}
            <em className="font-normal italic text-(--color-amber)">History</em>
          </div>
          <div className="mt-1.5 text-sm text-(--color-muted)">
            Tier: {DIFFICULTY_LABEL[tier]}
          </div>
        </header>

        <ProgressDots results={results} current={roundNumber} total={TOTAL_ROUNDS} />

        <div className="mb-6 border-y border-(--color-hairline) py-3 text-center text-sm tabular-nums text-(--color-muted)">
          Total{' '}
          <span
            key={`tot-${runningTotal}-${pulse ? 'p' : 'n'}`}
            className={pulse ? 'pfh-pulse' : ''}
            style={{ color: pulse ? 'var(--color-amber)' : 'var(--color-ink)' }}
          >
            {runningTotal}
          </span>{' '}
          · Tier streak <span className="text-(--color-ink)">{tierStreak}</span>
        </div>

        {loading && !figure ? (
          <LoadingPlaceholder />
        ) : error && !figure ? (
          <ErrorPlaceholder error={error} />
        ) : figures.length === 0 ? (
          <EmptyPlaceholder />
        ) : (
          <CropStage
            key={activeFigure.id}
            imageUrl={activeFigure.image_url ?? sampleFigure.image_url}
            focal={{ x: activeFigure.focal_x, y: activeFigure.focal_y }}
            startSize={activeFigure.start_size}
            revealPct={visualReveal}
          />
        )}

        <div className="flex items-center gap-3 py-4">
          <span className="min-w-14 text-sm text-(--color-muted)">Reveal</span>
          <input
            type="range"
            className="pfh-slider"
            min={10}
            max={100}
            value={visualReveal}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v > reveal) {
                setReveal(v);
              } else {
                // Monotonic: snap the DOM thumb back so the slider only
                // ratchets forward. Stops the "drag to 100, peek, drag
                // back to 10, guess for max points" cheat.
                e.currentTarget.value = String(reveal);
              }
            }}
            disabled={outcome !== 'playing' || !figure}
            aria-label="Reveal amount"
          />
          <span className="min-w-10 text-right text-sm tabular-nums text-(--color-ink)">
            {visualReveal}%
          </span>
        </div>

        <form onSubmit={submit} className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Who is this person?"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            disabled={outcome !== 'playing' || !figure}
            className="min-h-11 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-3.5 text-base text-(--color-ink) transition-colors duration-150 placeholder:text-(--color-muted) hover:border-(--color-hairline-strong) focus:border-(--color-amber) focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F4F2] disabled:text-(--color-muted)"
          />
          <button
            type="submit"
            disabled={outcome !== 'playing' || !figure}
            className="inline-flex min-h-11 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guess
          </button>
        </form>

        <FeedbackBox feedback={feedback} />

        {usedHints.length > 0 && figure && (
          <div className="mt-3 flex flex-wrap gap-2">
            {usedHints.map((key) => (
              <span
                key={key}
                className="pfh-fade inline-flex rounded-full border border-(--color-info-border) bg-(--color-info-bg) px-3 py-2 text-[13px] text-(--color-info)"
              >
                {hintLabel(key)}: {hintValue(figure, key) || '—'}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {HINTS.map((h) => (
            <HintButton
              key={h.key}
              label={h.label}
              used={usedHints.includes(h.key)}
              disabled={outcome !== 'playing' || !figure}
              onUse={() => useHint(h.key)}
            />
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            onClick={giveUp}
            disabled={outcome !== 'playing' || !figure}
            className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-hairline) bg-transparent px-6 py-3.5 text-sm font-medium text-(--color-body) transition-colors duration-150 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Give up
          </button>
          <button
            onClick={advance}
            disabled={outcome === 'playing' || !figure}
            className={
              'inline-flex min-h-11 items-center justify-center rounded-button px-6 py-3.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ' +
              (outcome !== 'playing'
                ? 'border border-(--color-amber) bg-(--color-amber) text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-(--color-amber-hover)'
                : 'border border-(--color-hairline) bg-transparent text-(--color-body)')
            }
          >
            {isLastRound ? 'See results' : 'Next figure'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressDots({
  results,
  current,
  total,
}: {
  results: RoundResult[];
  current: number;
  total: number;
}) {
  return (
    <div
      aria-label={`Round ${current} of ${total}`}
      className="mb-5 grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}
    >
      {Array.from({ length: total }, (_, i) => {
        const r = results[i];
        if (r) {
          const won = r.outcome === 'won';
          return (
            <div
              key={i}
              aria-hidden
              className="aspect-square rounded-sm border"
              style={{
                background: won ? 'var(--color-amber-soft-2)' : 'transparent',
                borderColor: won ? 'var(--color-amber-soft-2)' : 'var(--color-hairline-strong)',
              }}
            />
          );
        }
        const isCurrent = i + 1 === current;
        return (
          <div
            key={i}
            aria-hidden
            className="aspect-square rounded-sm border"
            style={{
              background: 'transparent',
              borderColor: isCurrent ? 'var(--color-amber)' : 'var(--color-hairline)',
              borderWidth: isCurrent ? 2 : 1,
            }}
          />
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
        'flex min-h-14 flex-col justify-center rounded-card border px-4.5 py-4 text-sm leading-[1.45] transition-colors duration-200 ' +
        classes[feedback.kind]
      }
    >
      <div>{feedback.text}</div>
      {feedback.sub && <div className="mt-1 text-xs opacity-80">{feedback.sub}</div>}
    </div>
  );
}

function HintButton({
  label,
  used,
  disabled,
  onUse,
}: {
  label: string;
  used: boolean;
  disabled: boolean;
  onUse: () => void;
}) {
  return (
    <button
      onClick={onUse}
      disabled={disabled || used}
      className={
        'rounded-full border px-3.5 py-2 text-xs font-medium transition-colors duration-150 ' +
        (used
          ? 'border-(--color-amber) bg-(--color-amber-soft) text-(--color-amber) cursor-default'
          : 'border-(--color-hairline) bg-transparent text-(--color-muted)') +
        (disabled && !used ? ' opacity-50' : '')
      }
    >
      {label}
    </button>
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

