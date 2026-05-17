import { useMemo } from 'react';

import { ShareCard } from '@/components/ShareCard';
import {
  getDailyStreak,
  loadLastDailyPlay,
  todayIsoDate,
  type DailyPlay,
} from '@/lib/daily';
import type { Screen } from '@/components/ProtoNav';

type DailyResultProps = { goTo: (s: Screen) => void };

function buildShareText(play: DailyPlay, streak: number): string {
  const date = new Date(play.date + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
  // 10 buckets across the 10–100% reveal range. Filled squares represent
  // the reveal at outcome time. Lost rounds get an all-black grid.
  const filled = play.won
    ? Math.max(1, Math.min(10, Math.round(play.reveal / 10)))
    : 10;
  const grid = play.won
    ? '🟧'.repeat(filled) + '⬜'.repeat(10 - filled)
    : '⬛'.repeat(10);
  const middle = play.won
    ? `Solved at ${play.reveal}% reveal · ${play.score} pts`
    : `Gave up — it was ${play.figureName}`;
  const streakLine = play.won ? `Day ${streak} streak` : 'Streak reset';
  return [`People from History · ${date}`, middle, grid, streakLine].join('\n');
}

export function DailyResult({ goTo }: DailyResultProps) {
  const play = useMemo(() => loadLastDailyPlay(), []);
  const streak = useMemo(() => getDailyStreak(), []);
  const today = useMemo(() => todayIsoDate(), []);

  // No play at all, or last play wasn't today — prompt to play.
  if (!play || play.date !== today) {
    return (
      <div className="h-[calc(100vh-41px)] overflow-y-auto bg-(--color-bg)">
        <div className="mx-auto max-w-[440px] px-6 pb-24 pt-12 text-center">
          <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
            § Today's puzzle
          </div>
          <h1
            className="mb-3"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              lineHeight: 1.1,
              fontWeight: 400,
              letterSpacing: '-0.018em',
              color: 'var(--color-ink)',
              textWrap: 'balance',
            }}
          >
            A fresh figure is{' '}
            <em className="font-normal italic text-(--color-amber)">waiting</em>.
          </h1>
          <p className="mb-8 text-base text-(--color-muted)">
            One try, one shareable result.
          </p>
          <a
            href="#daily-game"
            onClick={(e) => {
              e.preventDefault();
              goTo('daily-game');
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover) no-underline"
          >
            Play today's daily →
          </a>
        </div>
      </div>
    );
  }

  const won = play.won;
  const filled = won
    ? Math.max(1, Math.min(10, Math.round(play.reveal / 10)))
    : 10;
  const squares = Array.from({ length: 10 }, (_, i) => i < filled);
  const dateLabel = new Date(play.date + 'T00:00:00Z').toLocaleDateString(
    'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' },
  );

  const shareText = buildShareText(play, streak);

  return (
    <div className="h-[calc(100vh-41px)] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[440px] px-6 pb-24 pt-12">
        <div className="mb-10">
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

        <div className="mb-3.5 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
          § Daily · {dateLabel}
        </div>

        <div className="pfh-ornament mb-7">
          <div className="rule" />
          <div className="dot" />
          <div className="rule" />
        </div>

        <h1
          className="mb-4 text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 40,
            lineHeight: 1.1,
            fontWeight: 400,
            letterSpacing: '-0.018em',
            color: 'var(--color-ink)',
            textWrap: 'balance',
          }}
        >
          {won ? (
            <>
              Solved at{' '}
              <em className="font-normal italic text-(--color-amber)">
                {play.reveal}%
              </em>{' '}
              reveal.
            </>
          ) : (
            <>
              Today was{' '}
              <em className="font-normal italic text-(--color-amber)">
                {play.figureName}
              </em>
              .
            </>
          )}
        </h1>
        <div className="mb-12 text-center text-lg text-(--color-muted)">
          {won
            ? `+${play.score} points · Day ${streak} streak`
            : 'No points today. Streak reset.'}
        </div>

        <div
          aria-label={
            won
              ? `Solved at ${play.reveal}% reveal, ${filled} of 10 squares filled`
              : 'Gave up'
          }
          className="mb-3.5 grid gap-1.5"
          style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}
        >
          {squares.map((on, i) => (
            <div
              key={i}
              aria-hidden
              className="aspect-square rounded-sm border"
              style={{
                background: !won
                  ? 'var(--color-hairline-strong)'
                  : on
                    ? 'var(--color-amber-soft-2)'
                    : 'transparent',
                borderColor: !won
                  ? 'var(--color-hairline-strong)'
                  : on
                    ? 'var(--color-amber-soft-2)'
                    : 'var(--color-hairline)',
              }}
            />
          ))}
        </div>
        <div className="mb-9 text-center font-display text-sm italic text-(--color-muted)">
          {won ? `${filled} of 10 increments shaded.` : 'No solve today.'}
        </div>

        <div className="mb-10">
          <ShareCard text={shareText} />
        </div>

        <div className="pfh-ornament mb-6">
          <div className="rule" />
          <div className="dot" />
          <div className="rule" />
        </div>

        <div className="mb-3.5 text-center text-sm text-(--color-muted)">
          Come back tomorrow for a new puzzle.
        </div>

        <div className="text-center">
          <a
            href="#play-setup"
            onClick={(e) => {
              e.preventDefault();
              goTo('play-setup');
            }}
            className="text-sm font-medium text-(--color-amber) no-underline"
          >
            Play another mode →
          </a>
        </div>
      </div>
    </div>
  );
}
