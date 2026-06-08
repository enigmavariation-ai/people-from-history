import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppMenu } from '@/components/AppMenu';
import { ShareCard } from '@/components/ShareCard';
import { SignUpNudge } from '@/components/SignUpNudge';
import {
  getDailyStreak,
  loadLastDailyPlay,
  todayIsoDate,
  type DailyPlay,
} from '@/lib/daily';
import { renderDailyShareImage } from '@/lib/renderShareImage';
import { useFigures } from '@/lib/useFigures';
import type { Screen } from '@/components/ProtoNav';
import type { Figure } from '@/types/figure';

type DailyResultProps = { goTo: (s: Screen) => void };

function buildShareText(play: DailyPlay, streak: number): string {
  const date = new Date(play.date + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
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

// Time until the next UTC-midnight puzzle drop.
function formatTimeUntilNextPuzzle(now: Date): string {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  if (ms <= 60_000) return 'less than a minute';
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function DailyResult({ goTo }: DailyResultProps) {
  const play = useMemo(() => loadLastDailyPlay(), []);
  const streak = useMemo(() => getDailyStreak(), []);
  const today = useMemo(() => todayIsoDate(), []);
  const { figures } = useFigures();
  // Look up the played figure for portrait + about-panel data. Falls
  // back to a synthetic Figure built from the cached DailyPlay so we
  // can still render something while figures load.
  const figure = useMemo<Figure | null>(() => {
    if (!play) return null;
    const found = figures.find((f) => f.id === play.figureId);
    return found ?? null;
  }, [figures, play]);

  // Live countdown to the next puzzle, refreshed once per minute.
  const [timeLeft, setTimeLeft] = useState(() => formatTimeUntilNextPuzzle(new Date()));
  useEffect(() => {
    const tick = () => setTimeLeft(formatTimeUntilNextPuzzle(new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // No play at all, or last play wasn't today — prompt to play.
  if (!play || play.date !== today) {
    return (
      <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
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
  const getShareImage = useCallback(
    () => renderDailyShareImage(play, streak, figure),
    [play, streak, figure],
  );

  return (
    <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[480px] px-5 pb-24 pt-5 md:max-w-[1040px] md:px-10 md:pt-10">
        <div className="mb-5 md:mb-8">
          <AppMenu goTo={goTo} currentScreen="daily" />
        </div>

        <div className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted) md:mb-8">
          § Daily · {dateLabel}
        </div>

        {/* Body — single column on mobile, two columns on desktop with
            the portrait on the left and the result/copy on the right. */}
        <div className="md:grid md:grid-cols-[1.05fr_1fr] md:items-start md:gap-12">
          {/* Hero portrait of the figure they played. */}
          <FigureFrame figure={figure} figureName={play.figureName} />

          {/* Right column — result, stats, outcome grid, about. */}
          <div className="mt-8 md:mt-0">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-amber)">
              {won ? 'Solved' : 'Stumped'}
            </div>
            <h1
              className="mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(34px, 6vw, 48px)',
                lineHeight: 1.05,
                fontWeight: 400,
                letterSpacing: '-0.022em',
                color: 'var(--color-ink)',
                textWrap: 'balance',
              }}
            >
              {won ? (
                <>
                  At{' '}
                  <em className="font-normal italic text-(--color-amber)">
                    {play.reveal}%
                  </em>{' '}
                  reveal.
                </>
              ) : (
                <>
                  It was{' '}
                  <em className="font-normal italic text-(--color-amber)">
                    {play.figureName}
                  </em>
                  .
                </>
              )}
            </h1>

            {/* Metric pills */}
            <div className="mb-6 grid grid-cols-2 gap-2.5">
              <Stat label={won ? 'Score' : 'Score'} value={won ? `+${play.score}` : '0'} />
              <Stat
                label="Day streak"
                value={won ? String(streak) : '—'}
                sub={won ? undefined : 'reset'}
              />
            </div>

            {/* 10-square reveal grid — denser editorial framing. */}
            <div className="mb-6">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted)">
                {won ? `${filled} of 10 shaded` : 'No solve today'}
              </div>
              <div
                aria-label={
                  won
                    ? `Solved at ${play.reveal}% reveal, ${filled} of 10 squares filled`
                    : 'Gave up'
                }
                className="grid gap-1.5"
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
            </div>

            {/* About — auto-expanded on the result page, since the
                whole point of Daily is to learn. */}
            {figure?.summary && (
              <div className="mb-6 rounded-card border border-(--color-rule) bg-(--color-paper) px-4 py-3.5">
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-amber)">
                  About {figure.name}
                </div>
                <p className="text-sm leading-[1.5] text-(--color-body)">
                  {figure.summary}
                </p>
                {figure.wikipedia_url && (
                  <a
                    href={figure.wikipedia_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-(--color-amber) no-underline"
                  >
                    Learn more on Wikipedia →
                  </a>
                )}
              </div>
            )}

            {/* Share card */}
            <ShareCard text={shareText} getImage={getShareImage} />
          </div>
        </div>

        {/* Below-the-fold: sign-up nudge after a win, then countdown,
            then "play another mode" footer link. */}
        {won && (
          <div className="mt-10">
            <SignUpNudge
              goTo={goTo}
              eyebrow="Don't lose this"
              headline={
                streak >= 2
                  ? `${streak}-day streak — keep it safe across devices.`
                  : 'Save your daily streak across devices.'
              }
              body="One tap. Your nickname, plays, and streak come with you to your phone, laptop, anywhere."
            />
          </div>
        )}

        {/* Compact footer — countdown + cross-link on one row separated
            by a thin hairline rule. Centred on mobile so it doesn't
            run too wide; spaced apart on desktop. */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 border-t border-(--color-rule) pt-5 text-center sm:flex-row sm:gap-5 sm:text-left">
          <div className="inline-flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted)">
              Next puzzle
            </span>
            <span
              className="tabular-nums leading-none"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 500,
                color: 'var(--color-ink)',
                letterSpacing: '-0.012em',
              }}
            >
              {timeLeft}
            </span>
          </div>
          <span aria-hidden className="hidden text-(--color-muted) sm:inline">·</span>
          <a
            href="#challenge"
            onClick={(e) => {
              e.preventDefault();
              goTo('challenge');
            }}
            className="text-sm font-medium text-(--color-amber) no-underline"
          >
            Try the 10-figure challenge →
          </a>
        </div>
      </div>
    </div>
  );
}

// Editorial portrait frame for the revealed figure. Renders the full
// image with focal-aware object-position so the face anchors where
// the player's eye expects it. Corner registration marks + a name
// caption inside a gradient scrim along the bottom.
function FigureFrame({
  figure,
  figureName,
}: {
  figure: Figure | null;
  figureName: string;
}) {
  const eraField = figure
    ? [figure.era, figure.field, figure.region].filter(Boolean).join(' · ')
    : '';
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-card border border-(--color-rule) bg-(--color-paper) shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      {figure?.image_url ? (
        <img
          src={figure.image_url}
          alt={figure.name}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: `${figure.focal_x * 100}% ${figure.focal_y * 100}%`,
          }}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-xs text-(--color-muted)">
          Loading portrait…
        </div>
      )}

      {/* Corner registration marks for editorial framing. */}
      {(
        [
          { top: 10, left: 10, b: '1px 0 0 1px' },
          { top: 10, right: 10, b: '1px 1px 0 0' },
          { bottom: 64, left: 10, b: '0 0 1px 1px' },
          { bottom: 64, right: 10, b: '0 1px 1px 0' },
        ] satisfies Array<{
          top?: number;
          bottom?: number;
          left?: number;
          right?: number;
          b: string;
        }>
      ).map((p, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute"
          style={{
            width: 10,
            height: 10,
            borderColor: 'rgba(255,255,255,0.55)',
            borderStyle: 'solid',
            borderWidth: p.b,
            top: p.top,
            bottom: p.bottom,
            left: p.left,
            right: p.right,
          }}
        />
      ))}

      {/* Caption — name + era/field/region in a gradient scrim. */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-10"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
        }}
      >
        <div
          className="leading-tight text-white"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(20px, 4vw, 26px)',
            fontWeight: 500,
            letterSpacing: '-0.012em',
          }}
        >
          {figure?.name ?? figureName}
        </div>
        {eraField && (
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/75">
            {eraField}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-(--color-hairline) bg-white px-3 py-2.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-(--color-muted)">
        {label}
      </span>
      <span
        className="tabular-nums leading-none"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 500,
          color: 'var(--color-ink)',
        }}
      >
        {value}
      </span>
      {sub && <span className="text-[10px] text-(--color-muted)">{sub}</span>}
    </div>
  );
}
