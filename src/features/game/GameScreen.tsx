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

function selectNextFigure(
  pool: Figure[],
  difficulty: Difficulty,
  seen: Set<string>,
  excludeId: string | null,
): Figure | null {
  const filteredByDifficulty = pool.filter((f) => f.difficulty === difficulty);
  // 1: matching difficulty + unseen + not the current one
  const fresh = filteredByDifficulty.filter((f) => !seen.has(f.id) && f.id !== excludeId);
  if (fresh.length > 0) return pickRandom(fresh);
  // 2: matching difficulty, any seen state, just not the current one
  const sameDiff = filteredByDifficulty.filter((f) => f.id !== excludeId);
  if (sameDiff.length > 0) return pickRandom(sameDiff);
  // 3: any figure that isn't the current one
  const anyOther = pool.filter((f) => f.id !== excludeId);
  if (anyOther.length > 0) return pickRandom(anyOther);
  // 4: give up — only one figure in pool
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
      const next = r + 1;
      saveNumber('round', next);
      return next;
    });
  }, [figures, difficulty, seenIds, figure?.id]);

  // Pick the first figure once data lands.
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
      // When everyone has been seen, wipe the seen-set so endless really is endless.
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
      setReveal(100);
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
    setReveal(100);
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

  const headerNumeral = useMemo(
    () => `№ ${String(round).padStart(3, '0')}`,
    [round],
  );

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
            {headerNumeral} &nbsp;·&nbsp; Practice
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
          <div className="mt-1.5 flex items-baseline gap-2 text-sm text-(--color-muted)">
            <span>Round {round || 1} · {DIFFICULTY_LABEL[difficulty]}</span>
            <a
              href="#change"
              onClick={(e) => {
                e.preventDefault();
                goTo('play-setup');
              }}
              className="text-xs text-(--color-amber) no-underline hover:underline"
            >
              change
            </a>
          </div>
        </header>

        <div className="mb-6 border-y border-(--color-hairline) py-3 text-center text-sm tabular-nums text-(--color-muted)">
          Score{' '}
          <span
            key={`score-${score}-${pulse ? 'p' : 'n'}`}
            className={pulse ? 'pfh-pulse' : ''}
            style={{ color: pulse ? 'var(--color-amber)' : 'var(--color-ink)' }}
          >
            {score}
          </span>{' '}
          · Streak <span className="text-(--color-ink)">{streak}</span> · Round{' '}
          <span className="text-(--color-ink)">{round || 1}</span>
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
            revealPct={reveal}
          />
        )}

        <div className="flex items-center gap-3 py-4">
          <span className="min-w-14 text-sm text-(--color-muted)">Reveal</span>
          <input
            type="range"
            className="pfh-slider"
            min={10}
            max={100}
            value={reveal}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v > reveal) {
                setReveal(v);
              } else {
                // Monotonic: snap the DOM thumb back so the slider only
                // ratchets forward — see ChallengeScreen for context.
                e.currentTarget.value = String(reveal);
              }
            }}
            disabled={outcome !== 'playing' || !figure}
            aria-label="Reveal amount"
          />
          <span className="min-w-10 text-right text-sm tabular-nums text-(--color-ink)">
            {reveal}%
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
              onUse={() => useHint(h.key, h.cost)}
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
            onClick={next}
            disabled={outcome === 'playing' || !figure}
            className={
              'inline-flex min-h-11 items-center justify-center rounded-button px-6 py-3.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ' +
              (outcome !== 'playing'
                ? 'border border-(--color-amber) bg-(--color-amber) text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-(--color-amber-hover)'
                : 'border border-(--color-hairline) bg-transparent text-(--color-body)')
            }
          >
            Next figure
          </button>
        </div>
      </div>
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
      {feedback.sub && (
        <div className="mt-1 text-xs opacity-80">{feedback.sub}</div>
      )}
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
