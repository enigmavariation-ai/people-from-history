import { useEffect, useState } from 'react';

import { sampleFigure } from '@/data/sampleFigure';
import { CropStage } from '@/features/game/CropStage';
import type { Screen } from '@/components/ProtoNav';

export type GameVariant = 'initial' | 'mid' | 'correct';

type GameScreenProps = {
  goTo: (s: Screen) => void;
  variant: GameVariant;
};

type Feedback = { kind: 'neutral' | 'success' | 'error'; text: string };

type HintKey = 'era' | 'field' | 'region' | 'letter';

const HINTS: { key: HintKey; label: string; cost: number }[] = [
  { key: 'era', label: 'Era (-5)', cost: 5 },
  { key: 'field', label: 'Field (-10)', cost: 10 },
  { key: 'region', label: 'Region (-10)', cost: 10 },
  { key: 'letter', label: 'Letter (-15)', cost: 15 },
];

export function GameScreen({ goTo, variant }: GameScreenProps) {
  const initialReveal = variant === 'initial' ? 15 : variant === 'mid' ? 42 : 100;
  const initialGuess = variant === 'mid' ? 'Newton' : '';
  const initialFeedback: Feedback =
    variant === 'initial'
      ? { kind: 'neutral', text: 'Start with a tight crop for max points.' }
      : variant === 'mid'
        ? { kind: 'error', text: 'Not quite — try revealing more, or use a hint.' }
        : { kind: 'success', text: "Correct! That's Albert Einstein. +85 points." };

  const initialUsedHints: HintKey[] =
    variant === 'mid' || variant === 'correct' ? ['era'] : [];
  const initialScore = variant === 'correct' ? 85 : 0;
  const initialStreak = variant === 'correct' ? 1 : 0;
  const initialDisabled = variant === 'correct';

  const [reveal, setReveal] = useState(initialReveal);
  const [guess, setGuess] = useState(initialGuess);
  const [feedback, setFeedback] = useState<Feedback>(initialFeedback);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [usedHints, setUsedHints] = useState<HintKey[]>(initialUsedHints);
  const [score, setScore] = useState(initialScore);
  const [streak, setStreak] = useState(initialStreak);
  const [disabled, setDisabled] = useState(initialDisabled);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setReveal(initialReveal);
    setGuess(initialGuess);
    setFeedback(initialFeedback);
    setUsedHints(initialUsedHints);
    setScore(initialScore);
    setStreak(initialStreak);
    setDisabled(initialDisabled);
    if (variant === 'correct') {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const g = guess.trim().toLowerCase();
    if (!g) return;
    if (g.includes('einstein')) {
      const earned = Math.max(20, Math.round(100 - reveal * 0.5));
      setScore((s) => s + earned);
      setStreak((s) => s + 1);
      setReveal(100);
      setDisabled(true);
      setFeedback({
        kind: 'success',
        text: `Correct! That's Albert Einstein. +${earned} points.`,
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 1300);
    } else {
      setStreak(0);
      setFeedback({
        kind: 'error',
        text: 'Not quite — try revealing more, or use a hint.',
      });
    }
  };

  const useHint = (key: HintKey, cost: number) => {
    if (disabled) return;
    if (usedHints.includes(key)) return;
    setUsedHints((u) => [...u, key]);
    setScore((s) => Math.max(0, s - cost));
  };

  const showInfoPill = usedHints.includes('era');

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
            № 142 &nbsp;·&nbsp; 15 . V . 2026
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
            Round 1 · {difficulty}
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
          <span className="text-(--color-ink)">1</span>
        </div>

        <div className="mb-6 flex gap-2">
          {(['Easy', 'Medium', 'Hard'] as const).map((d) => {
            const active = d === difficulty;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={
                  'min-h-10 flex-1 rounded-button border px-3 py-2.5 text-sm font-medium transition-colors duration-150 ' +
                  (active
                    ? 'border-(--color-amber) bg-(--color-amber-soft) text-(--color-amber)'
                    : 'border-(--color-hairline) bg-transparent text-(--color-muted)')
                }
              >
                {d}
              </button>
            );
          })}
        </div>

        <CropStage
          imageUrl={sampleFigure.image_url}
          focal={{ x: sampleFigure.focal_x, y: sampleFigure.focal_y }}
          startSize={sampleFigure.start_size}
          revealPct={reveal}
        />

        <div className="flex items-center gap-3 py-4">
          <span className="min-w-14 text-sm text-(--color-muted)">Reveal</span>
          <input
            type="range"
            className="pfh-slider"
            min={10}
            max={100}
            value={reveal}
            onChange={(e) => setReveal(parseInt(e.target.value, 10))}
            disabled={disabled}
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
            disabled={disabled}
            className="min-h-11 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-3.5 text-base text-(--color-ink) transition-colors duration-150 placeholder:text-(--color-muted) hover:border-(--color-hairline-strong) focus:border-(--color-amber) focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F4F2] disabled:text-(--color-muted)"
          />
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex min-h-11 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guess
          </button>
        </form>

        <FeedbackBox feedback={feedback} />

        {showInfoPill && (
          <div className="pfh-fade mt-3 inline-flex rounded-full border border-(--color-info-border) bg-(--color-info-bg) px-3 py-2 text-[13px] text-(--color-info)">
            Era: 20th century
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {HINTS.map((h) => (
            <HintButton
              key={h.key}
              label={h.label}
              used={usedHints.includes(h.key)}
              disabled={disabled}
              onUse={() => useHint(h.key, h.cost)}
            />
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            onClick={() => goTo('game-initial')}
            className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-hairline) bg-transparent px-6 py-3.5 text-sm font-medium text-(--color-body) transition-colors duration-150 hover:bg-black/[0.03]"
          >
            Skip
          </button>
          {variant === 'correct' ? (
            <button
              onClick={() => goTo('game-initial')}
              className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
            >
              Next figure
            </button>
          ) : (
            <button
              onClick={() => goTo('game-initial')}
              className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-hairline) bg-transparent px-6 py-3.5 text-sm font-medium text-(--color-body) transition-colors duration-150 hover:bg-black/[0.03]"
            >
              Next figure
            </button>
          )}
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
  };
  return (
    <div
      className={
        'flex min-h-14 items-center rounded-card border px-4.5 py-4 text-sm leading-[1.45] transition-colors duration-200 ' +
        classes[feedback.kind]
      }
    >
      {feedback.text}
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
