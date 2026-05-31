import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

import { AppMenu } from '@/components/AppMenu';
import { ShareCard } from '@/components/ShareCard';
import { SignUpNudge } from '@/components/SignUpNudge';
import { renderChallengeShareImage } from '@/lib/renderShareImage';
import { useFigures } from '@/lib/useFigures';
import { LeaderboardView, type Board } from '@/features/leaderboard/LeaderboardView';
import {
  getCurrentSessionUserId,
  getNickname,
  getTopRuns,
  submitRun,
  type Run,
} from '@/lib/runs';
import { loadString } from '@/lib/storage';
import type { Screen } from '@/components/ProtoNav';
import type { Difficulty, Figure } from '@/types/figure';
import type { RoundResult } from '@/features/game/ChallengeScreen';

type ChallengeEndScreenProps = { goTo: (s: Screen) => void };

type LastRun = {
  results: RoundResult[];
  total: number;
  finishedAt: string;
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'E',
  medium: 'M',
  hard: 'H',
};

function loadLastRun(): LastRun | null {
  const raw = loadString('challenge:lastRun');
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'results' in parsed &&
      'total' in parsed &&
      Array.isArray((parsed as LastRun).results)
    ) {
      return parsed as LastRun;
    }
    return null;
  } catch {
    return null;
  }
}

function buildShareText(run: LastRun): string {
  const date = new Date(run.finishedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
  const correct = run.results.filter((r) => r.outcome === 'won').length;
  const grid = run.results.map((r) => (r.outcome === 'won' ? '🟧' : '⬛')).join('');
  const tiers = run.results.map((r) => DIFFICULTY_LABEL[r.difficulty]).join('');
  return [
    `People from History · Challenge · ${date}`,
    `Score ${run.total} · ${correct}/${run.results.length}`,
    grid,
    tiers,
  ].join('\n');
}

// Editorial verdict tied to the player's accuracy (with a small kick
// for hard-tier wins). Keeps the celebratory moment in the voice of
// the rest of the app — museum-plate, not arcade.
function computeVerdict(
  correct: number,
  total: number,
  tierCounts: Record<Difficulty, number>,
): string {
  const accuracy = total > 0 ? correct / total : 0;
  if (correct === total && tierCounts.hard >= 3) return 'Encyclopaedic.';
  if (correct === total) return 'Faultless.';
  if (accuracy >= 0.8) return 'A fine eye.';
  if (accuracy >= 0.6) return 'Sharp.';
  if (accuracy >= 0.4) return 'Steady run.';
  if (accuracy >= 0.2) return 'Tough one.';
  return 'A workout.';
}

export function ChallengeEndScreen({ goTo }: ChallengeEndScreenProps) {
  const [run] = useState<LastRun | null>(() => loadLastRun());
  const { figures } = useFigures();
  // Rounds-by-round table is closed by default — the outcome strip
  // above conveys the shape of the run at a glance; the table is
  // only useful when a player wants to study an individual round.
  const [roundsOpen, setRoundsOpen] = useState(false);

  // Identity + leaderboard state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeBoard, setActiveBoard] = useState<Board>('today');
  const [todayRuns, setTodayRuns] = useState<Run[] | null>(null);
  const [allTimeRuns, setAllTimeRuns] = useState<Run[] | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);

  // Cloudflare Turnstile (captcha) state. Only required for the first
  // sign-in from this browser; returning users with an existing anon
  // session won't need a fresh token to submit.
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  // Init: read existing session + pre-fill nickname from profile.
  // Does NOT trigger a fresh anon sign-in on mount — that would fail
  // without a captcha token. First-time visitors get the empty form;
  // anon auth runs at submit time (with the captcha token attached).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = await getCurrentSessionUserId();
        if (cancelled || !uid) return;
        setCurrentUserId(uid);
        const saved = await getNickname(uid);
        if (!cancelled && saved) setNickname(saved);
      } catch (e) {
        console.warn('Session lookup failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch leaderboards after a successful submit.
  useEffect(() => {
    if (!isSubmitted) return;
    let cancelled = false;
    (async () => {
      try {
        const [today, allTime] = await Promise.all([
          getTopRuns('today'),
          getTopRuns('all-time'),
        ]);
        if (cancelled) return;
        setTodayRuns(today);
        setAllTimeRuns(allTime);
      } catch (e) {
        if (cancelled) return;
        setBoardError(e instanceof Error ? e.message : 'Failed to load leaderboard.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSubmitted]);

  if (!run) {
    return (
      <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
        <div className="mx-auto max-w-[440px] px-6 pb-24 pt-12 text-center">
          <p className="mb-6 text-sm text-(--color-muted)">
            No completed challenge yet.
          </p>
          <a
            href="#play-setup"
            onClick={(e) => {
              e.preventDefault();
              goTo('play-setup');
            }}
            className="text-sm font-medium text-(--color-amber) no-underline"
          >
            Start a challenge →
          </a>
        </div>
      </div>
    );
  }

  const correct = run.results.filter((r) => r.outcome === 'won').length;
  const shareText = buildShareText(run);
  const dateLabel = new Date(run.finishedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !run) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submitRun(
        {
          nickname,
          score: run.total,
          correctCount: correct,
          figureIds: run.results.map((r) => r.figureId),
        },
        captchaToken ?? undefined,
      );
      setIsSubmitted(true);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Couldn't submit your score.",
      );
      // Turnstile tokens are single-use; reset for the next attempt.
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const accuracy = Math.round((correct / run.results.length) * 100);
  const tierCounts = run.results.reduce(
    (acc, r) => {
      acc[r.difficulty]++;
      return acc;
    },
    { easy: 0, medium: 0, hard: 0 } as Record<Difficulty, number>,
  );
  // "Best round" = highest-scoring won round. A lost round with
  // finalScore 0 should never count, since giving up always scores 0.
  const bestRound = run.results.reduce<RoundResult | null>(
    (best, r) => {
      if (r.outcome !== 'won') return best;
      return best === null || r.finalScore > best.finalScore ? r : best;
    },
    null,
  );
  const verdict = computeVerdict(correct, run.results.length, tierCounts);
  const bestRoundFigure = useMemo<Figure | null>(() => {
    if (!bestRound) return null;
    return figures.find((f) => f.id === bestRound.figureId) ?? null;
  }, [figures, bestRound]);
  const getShareImage = useCallback(
    () => renderChallengeShareImage(run, bestRound, bestRoundFigure),
    [run, bestRound, bestRoundFigure],
  );

  return (
    <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[520px] px-5 pt-5 md:max-w-[1040px] md:px-10 md:pt-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 11rem)' }}>
        <div className="mb-5 md:mb-8">
          <AppMenu goTo={goTo} currentScreen="challenge-end" />
        </div>

        <div className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-(--color-muted)">
          § Challenge · {dateLabel}
        </div>

        {/* Hero scoreboard — navy contrast panel. Big number, editorial
            verdict, accuracy beneath. One moment, no competing chrome. */}
        <div className="pfh-navy mb-6 overflow-hidden rounded-card px-6 py-9 text-center md:mb-8 md:px-12 md:py-12">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-(--color-gold)">
            Final score
          </div>
          <div
            className="tabular-nums leading-none text-white"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(80px, 20vw, 168px)',
              fontWeight: 400,
              letterSpacing: '-0.04em',
            }}
          >
            {run.total}
          </div>
          <div
            className="mt-3 italic"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(22px, 4vw, 32px)',
              fontWeight: 400,
              color: 'var(--color-gold)',
              letterSpacing: '-0.012em',
            }}
          >
            {verdict}
          </div>
          <div className="mt-4 text-sm text-white/70 md:text-base">
            {correct} of {run.results.length} correct · {accuracy}% accuracy
            <span className="mx-2 text-white/30">·</span>
            {tierCounts.easy}E · {tierCounts.medium}M · {tierCounts.hard}H
          </div>
        </div>

        {/* Best-round portrait card — only when at least one round was
            won. Anchors the win moment to an actual face, paving the
            way for the share image to do the same. */}
        {bestRound && (
          <div className="mb-8">
            <BestRoundCard round={bestRound} figure={bestRoundFigure} />
          </div>
        )}

        {/* Primary action zone — pre-submit: nickname form. Post-submit:
            leaderboard. One thing on the page, prominently placed. */}
        {!isSubmitted ? (
          <div className="mb-10 rounded-card border border-(--color-amber-soft-2) bg-(--color-amber-soft)/40 px-5 py-5 md:px-7 md:py-6">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
              Post to the leaderboard
            </div>
            <h2
              className="mb-3"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(22px, 3.4vw, 28px)',
                fontWeight: 500,
                color: 'var(--color-ink)',
                letterSpacing: '-0.014em',
              }}
            >
              See how your run stacks up.
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={32}
                disabled={isSubmitting}
                className="min-h-12 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-3 text-base text-(--color-ink) placeholder:text-(--color-muted) focus:border-(--color-amber) focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F4F2]"
              />
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  nickname.trim().length === 0 ||
                  (!!turnstileSiteKey && !currentUserId && !captchaToken)
                }
                className="inline-flex min-h-12 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover) disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Posting…'
                  : turnstileSiteKey && !currentUserId && !captchaToken
                    ? 'Verifying…'
                    : 'Submit score →'}
              </button>
            </form>
            {turnstileSiteKey && !currentUserId && (
              <div className="mt-3 flex items-center gap-3">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  onSuccess={setCaptchaToken}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                  options={{
                    appearance: 'always',
                    refreshExpired: 'auto',
                    theme: 'light',
                    size: 'compact',
                  }}
                />
                {!captchaToken && (
                  <span className="text-xs text-(--color-muted)">
                    Verifying you're human…
                  </span>
                )}
              </div>
            )}
            {!turnstileSiteKey && (
              <div className="mt-3 rounded border border-(--color-error-border) bg-(--color-error-bg) px-3 py-2 text-xs text-(--color-error)">
                Turnstile site key not set. Restart <code>npm run dev</code> after
                adding <code>VITE_TURNSTILE_SITE_KEY</code> to <code>.env.local</code>.
              </div>
            )}
            {submitError && (
              <div className="mt-3 rounded border border-(--color-error-border) bg-(--color-error-bg) px-3 py-2 text-xs text-(--color-error)">
                {submitError}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-10">
            <LeaderboardView
              activeBoard={activeBoard}
              onSwitchBoard={setActiveBoard}
              todayRuns={todayRuns}
              allTimeRuns={allTimeRuns}
              error={boardError}
              currentUserId={currentUserId}
            />
          </div>
        )}

        {/* Proof zone — outcome strip + the rounds detail underneath.
            Visually de-emphasised so the score and CTA remain the
            anchors. Outcome strip is the at-a-glance shape of the run;
            the rounds table is for completeness. */}
        <div className="mb-10">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted)">
            Your run · 10 rounds
          </div>
          <div className="rounded-card border border-(--color-hairline) bg-white px-4 py-4 md:px-6 md:py-5">
            <div
              aria-label={`Round outcomes: ${correct} of ${run.results.length}`}
              className="mb-2 grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${run.results.length}, 1fr)` }}
            >
              {run.results.map((r, i) => (
                <div
                  key={i}
                  aria-hidden
                  className="aspect-square rounded-sm border"
                  style={{
                    background:
                      r.outcome === 'won' ? 'var(--color-amber-soft-2)' : 'transparent',
                    borderColor:
                      r.outcome === 'won'
                        ? 'var(--color-amber-soft-2)'
                        : 'var(--color-hairline-strong)',
                  }}
                />
              ))}
            </div>
            <div
              className="grid gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-(--color-muted)"
              style={{ gridTemplateColumns: `repeat(${run.results.length}, 1fr)` }}
            >
              {run.results.map((r, i) => (
                <div key={i} className="text-center">
                  {DIFFICULTY_LABEL[r.difficulty]}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRoundsOpen((v) => !v)}
              aria-expanded={roundsOpen}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-button border border-(--color-hairline) bg-transparent px-3 py-2 text-xs font-medium text-(--color-body) transition-colors duration-150 hover:bg-(--color-bg)"
            >
              {roundsOpen ? 'Hide round details' : 'View round-by-round'}
              <span
                aria-hidden
                className="transition-transform duration-200"
                style={{ transform: roundsOpen ? 'rotate(180deg)' : 'none' }}
              >
                ↓
              </span>
            </button>
            {roundsOpen && (
              <div className="mt-3">
                <RoundsTable results={run.results} />
              </div>
            )}
          </div>
        </div>

        {/* Share + secondary actions. Share is the secondary moment —
            big enough to be noticed, not so big it competes with the
            Submit CTA above. */}
        <div className="mb-10">
          <ShareCard text={shareText} getImage={getShareImage} />
        </div>

        {isSubmitted && (
          <div className="mb-10">
            <SignUpNudge
              goTo={goTo}
              eyebrow="Keep your runs"
              headline="Sign in so your leaderboard runs live with you."
              body="Right now they're tied to this browser. Link your email and you'll see your history (and submit runs) from any device."
            />
          </div>
        )}

        {/* Closing action — Try again is the primary path out. Make
            it a full-width filled CTA so the eye lands here at the
            end of the page without searching. */}
        <div className="mt-2">
          <button
            onClick={() => goTo('challenge')}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3 text-base font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            Try again
            <span aria-hidden style={{ fontSize: 16 }}>
              →
            </span>
          </button>
          <div className="mt-3 text-center">
            <button
              onClick={() => goTo('landing')}
              className="text-sm text-(--color-muted) hover:text-(--color-body)"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hero card for the player's highest-scoring round. Uses the figure's
// portrait with focal-aware cropping so the face anchors the win.
// Layout intentionally horizontal — a "trophy" feel without leaning
// into ornament.
function BestRoundCard({
  round,
  figure,
}: {
  round: RoundResult;
  figure: Figure | null;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-(--color-amber-soft-2) bg-white">
      <div className="flex items-stretch gap-0">
        <div className="relative w-32 flex-shrink-0 overflow-hidden bg-(--color-paper) md:w-40">
          <div className="aspect-square h-full w-full">
            {figure?.image_url ? (
              <img
                src={figure.image_url}
                alt={figure.name}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: `${figure.focal_x * 100}% ${figure.focal_y * 100}%`,
                }}
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs text-(--color-muted)">
                {round.figureName}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-4 py-3 md:px-6 md:py-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-amber)">
            Best round
          </div>
          <div
            className="mb-1 leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(20px, 3vw, 26px)',
              fontWeight: 500,
              color: 'var(--color-ink)',
              letterSpacing: '-0.012em',
            }}
          >
            {round.figureName}
          </div>
          <div className="text-sm text-(--color-muted)">
            Solved at{' '}
            <span className="tabular-nums text-(--color-body)">{round.reveal}%</span>{' '}
            reveal ·{' '}
            <span className="font-medium text-(--color-amber)">
              +{round.finalScore} points
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoundsTable({ results }: { results: RoundResult[] }) {
  return (
    <div className="-mx-4 overflow-x-auto border-t border-(--color-hairline) md:-mx-6">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-(--color-hairline)">
          <tr className="text-(--color-muted)">
            <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em]">
              #
            </th>
            <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em]">
              Tier
            </th>
            <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em]">
              Figure
            </th>
            <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.08em]">
              Reveal
            </th>
            <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.08em]">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const won = r.outcome === 'won';
            return (
              <tr
                key={i}
                className="border-b border-(--color-hairline) last:border-0"
              >
                <td className="px-4 py-2.5 tabular-nums text-(--color-muted)">
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.08em]"
                    style={{
                      color:
                        r.difficulty === 'hard'
                          ? 'var(--color-amber)'
                          : 'var(--color-muted)',
                    }}
                  >
                    {r.difficulty}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-(--color-ink)">
                  {won ? (
                    <span>{r.figureName}</span>
                  ) : (
                    <span className="text-(--color-muted)">
                      {r.figureName}{' '}
                      <span className="text-[11px]">(missed)</span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-(--color-muted)">
                  {r.reveal}%
                </td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-(--color-ink)">
                  {r.finalScore || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

