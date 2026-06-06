import { useCallback, useEffect, useState } from 'react';

import { RoundChrome } from '@/features/game/GameScreen';
import { getRecentIds, markShown } from '@/lib/figureCooldown';
import { MAX_GUESSES_PER_ROUND } from '@/lib/gameRules';
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

const NEUTRAL_FEEDBACK: Feedback = {
  kind: 'neutral',
  text: 'Start with a tight crop for max points.',
};

const TOTAL_ROUNDS = 10;
const STREAK_TO_BUMP = 2;

function nextTier(t: Difficulty): Difficulty {
  if (t === 'easy') return 'medium';
  if (t === 'medium') return 'hard';
  return 'hard';
}

function tierBelow(t: Difficulty): Difficulty {
  if (t === 'hard') return 'medium';
  if (t === 'medium') return 'easy';
  return 'easy';
}

function pickRandom<T>(pool: T[]): T | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function selectFigure(
  pool: Figure[],
  tier: Difficulty,
  usedIds: ReadonlySet<string>,
  cooldown: ReadonlySet<string>,
): Figure | null {
  const sameTier = pool.filter((f) => f.difficulty === tier);
  // First try: not used this run, not in cross-mode cooldown.
  const freshest = sameTier.filter(
    (f) => !usedIds.has(f.id) && !cooldown.has(f.id),
  );
  if (freshest.length > 0) return pickRandom(freshest);
  // Then: ignore cooldown but keep the per-run exclusion.
  const freshThisRun = sameTier.filter((f) => !usedIds.has(f.id));
  if (freshThisRun.length > 0) return pickRandom(freshThisRun);
  if (sameTier.length > 0) return pickRandom(sameTier);
  return pickRandom(pool);
}

export function ChallengeScreen({ goTo }: ChallengeScreenProps) {
  const { figures, loading, error } = useFigures();

  // Run-level state (reset per challenge).
  const [results, setResults] = useState<RoundResult[]>([]);
  const [tier, setTier] = useState<Difficulty>('easy');
  // `tierStreak` is internal bookkeeping for tier climbing — it
  // resets when the tier bumps. `correctStreak` is the visible
  // "N in a row" the player sees in the score pill; it only
  // resets on a loss / give-up so a tier climb doesn't make the
  // streak digit appear to jump back to 0 mid-run.
  const [tierStreak, setTierStreak] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);

  // Round-level state.
  const [figure, setFigure] = useState<Figure | null>(null);
  const [reveal, setReveal] = useState(10);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(NEUTRAL_FEEDBACK);
  const [usedHints, setUsedHints] = useState<HintType[]>([]);
  const [outcome, setOutcome] = useState<Outcome>('playing');
  const [pulse, setPulse] = useState(false);
  const [guessesUsed, setGuessesUsed] = useState(0);

  const usedFigureIds = new Set(results.map((r) => r.figureId));

  const pickFirstFigure = useCallback(() => {
    const picked = selectFigure(figures, 'easy', new Set(), getRecentIds());
    if (!picked) return;
    setFigure(picked);
    markShown(picked.id);
  }, [figures]);

  useEffect(() => {
    if (!figure && figures.length > 0) pickFirstFigure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figures]);

  // Shared submission path used by both the form (typed Enter / Guess
  // button) and the typeahead (tap a suggestion). Reads the raw value
  // explicitly so a suggestion tap doesn't race against React's
  // pending setState for `guess`.
  const submitGuess = (raw: string) => {
    if (!figure || outcome !== 'playing') return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (matches(trimmed, [figure.name, ...figure.aliases])) {
      const earned = scoreChallengeRound(reveal, usedHints, tier);
      setOutcome('won');
      setFeedback({
        kind: 'success',
        text: `That's ${figure.name}. +${earned} points.`,
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 1300);
      return;
    }

    const next = guessesUsed + 1;
    setGuessesUsed(next);
    if (next >= MAX_GUESSES_PER_ROUND) {
      setOutcome('lost');
      const metaParts = [figure.era, figure.field, figure.region].filter(Boolean);
      setFeedback({
        kind: 'reveal',
        text: `Out of guesses — it was ${figure.name}.`,
        sub: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
      });
    } else {
      setFeedback({
        kind: 'error',
        text: 'Not quite — try revealing more, or use a hint.',
      });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    submitGuess(guess);
  };

  const selectSuggestion = (name: string) => {
    setGuess(name);
    submitGuess(name);
  };

  const useHint = (key: HintType) => {
    if (outcome !== 'playing' || !figure) return;
    if (usedHints.includes(key)) return;
    setUsedHints((prev) => [...prev, key]);
  };

  const giveUp = () => {
    if (!figure || outcome !== 'playing') return;
    setOutcome('lost');
    const metaParts = [figure.era, figure.field, figure.region].filter(Boolean);
    setFeedback({
      kind: 'reveal',
      text: `It was ${figure.name}.`,
      sub: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
  };

  const advance = () => {
    if (!figure || outcome === 'playing') return;

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

    let newTier = tier;
    let newTierStreak = tierStreak;
    let newCorrectStreak = correctStreak;
    if (outcome === 'won') {
      newCorrectStreak = correctStreak + 1;
      newTierStreak = tierStreak + 1;
      if (newTierStreak >= STREAK_TO_BUMP && tier !== 'hard') {
        newTier = nextTier(tier);
        newTierStreak = 0;
      }
    } else {
      // Lost (gave up or out of guesses): drop a tier and reset
      // both counters. Easy floors.
      newTier = tierBelow(tier);
      newTierStreak = 0;
      newCorrectStreak = 0;
    }

    const nextUsed = new Set(usedFigureIds);
    nextUsed.add(figure.id);
    const nextFigure = selectFigure(figures, newTier, nextUsed, getRecentIds());
    if (nextFigure) markShown(nextFigure.id);

    setResults(newResults);
    setTier(newTier);
    setTierStreak(newTierStreak);
    setCorrectStreak(newCorrectStreak);
    setFigure(nextFigure);
    setReveal(10);
    setGuess('');
    setFeedback(NEUTRAL_FEEDBACK);
    setUsedHints([]);
    setOutcome('playing');
    setGuessesUsed(0);
  };

  const roundNumber = results.length + 1;
  const isLastRound = results.length === TOTAL_ROUNDS - 1;
  const roundsRemaining = TOTAL_ROUNDS - results.length;

  const visualReveal = outcome === 'playing' ? reveal : 100;
  const pendingScore =
    outcome === 'won' && figure ? scoreChallengeRound(reveal, usedHints, tier) : 0;
  const runningTotal = results.reduce((s, r) => s + r.finalScore, 0) + pendingScore;

  const potential = figure ? scoreChallengeRound(reveal, usedHints, tier) : 0;

  return (
    <RoundChrome
      mode="challenge"
      headerNumeral={`№ ${String(roundNumber).padStart(2, '0')} / ${TOTAL_ROUNDS}`}
      headerLabel="Challenge"
      subtitleLeft={`Round ${roundNumber} of ${TOTAL_ROUNDS}`}
      hintsUsedCount={usedHints.length}
      difficulty={tier}
      onChangeDifficulty={() => goTo('play-setup')}
      goTo={goTo}
      currentScreen="challenge"
      loading={loading && !figure}
      error={error && !figure ? error : null}
      empty={!loading && !error && figures.length === 0}
      figure={figure ?? { ...EMPTY_FIGURE }}
      reveal={reveal}
      visualReveal={visualReveal}
      onReveal={(v) => {
        if (v > reveal) setReveal(v);
      }}
      potential={potential}
      score={runningTotal}
      streak={correctStreak}
      outcome={outcome}
      pulse={pulse}
      guess={guess}
      onGuess={setGuess}
      onSubmit={submit}
      onSelectSuggestion={selectSuggestion}
      figurePool={figures}
      feedback={feedback}
      usedHints={usedHints}
      onUseHint={useHint}
      onGiveUp={giveUp}
      onNext={advance}
      footMeta={`${roundsRemaining} round${roundsRemaining === 1 ? '' : 's'} left`}
      guessesUsed={guessesUsed}
      guessesMax={MAX_GUESSES_PER_ROUND}
      scoreLabel="Total"
      streakLabel="Streak"
      nextLabel={isLastRound ? 'See results' : 'Next figure'}
      topInsert={<ProgressDots results={results} current={roundNumber} total={TOTAL_ROUNDS} />}
    />
  );
}

// Used while figures are loading — never actually displayed because
// RoundChrome covers that case with its LoadingPlaceholder.
const EMPTY_FIGURE: Figure = {
  id: '__placeholder__',
  name: '',
  aliases: [],
  image_url: null,
  focal_x: 0.5,
  focal_y: 0.4,
  start_size: 0.15,
  focal_alts: [],
  focal_note: '',
  difficulty: 'easy',
  era: '',
  field: '',
  region: '',
  first_letter: '',
  enabled: true,
  created_at: new Date(0).toISOString(),
  summary: '',
  wikipedia_url: null,
};

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
      className="grid gap-1.5"
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
              className="h-2.5 rounded-sm"
              style={{
                background: won
                  ? 'var(--color-amber-soft-2)'
                  : 'var(--color-hairline-strong)',
              }}
            />
          );
        }
        const isCurrent = i + 1 === current;
        return (
          <div
            key={i}
            aria-hidden
            className={
              isCurrent
                ? 'h-2.5 rounded-sm'
                : 'h-2.5 rounded-sm border border-(--color-hairline)'
            }
            style={{
              background: isCurrent ? 'var(--color-amber)' : 'transparent',
            }}
          />
        );
      })}
    </div>
  );
}
