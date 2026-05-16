import { useEffect, useState } from 'react';

import { ensureAnonAuth, getNickname, getTopRuns, submitRun, type Run } from '@/lib/runs';
import { loadString } from '@/lib/storage';
import type { Screen } from '@/components/ProtoNav';
import type { Difficulty } from '@/types/figure';
import type { RoundResult } from '@/features/game/ChallengeScreen';

type ChallengeEndScreenProps = { goTo: (s: Screen) => void };

type LastRun = {
  results: RoundResult[];
  total: number;
  finishedAt: string;
};

type Board = 'today' | 'all-time';

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

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function ChallengeEndScreen({ goTo }: ChallengeEndScreenProps) {
  const [run] = useState<LastRun | null>(() => loadLastRun());
  const [copied, setCopied] = useState(false);

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

  // Init: anon auth + pre-fill nickname from profile.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = await ensureAnonAuth();
        if (cancelled) return;
        setCurrentUserId(uid);
        const saved = await getNickname();
        if (!cancelled && saved) setNickname(saved);
      } catch (e) {
        // Auth/profile errors are non-fatal — user can still see their
        // result and the share text. They just can't post or load the
        // leaderboard.
        console.warn('Anon auth / nickname lookup failed', e);
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
      <div className="h-[calc(100vh-41px)] overflow-y-auto bg-(--color-bg)">
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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !run) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submitRun({
        nickname,
        score: run.total,
        correctCount: correct,
        figureIds: run.results.map((r) => r.figureId),
      });
      setIsSubmitted(true);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : 'Couldn\'t submit your score.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-41px)] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[480px] px-6 pb-24 pt-12">
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
          § Challenge · {dateLabel}
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
          <em className="font-normal italic text-(--color-amber)">{run.total}</em> points.
        </h1>
        <div className="mb-10 text-center text-lg text-(--color-muted)">
          {correct} of {run.results.length} correct
        </div>

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
        <div className="mb-9 text-center font-display text-sm italic text-(--color-muted)">
          {run.results.map((r) => DIFFICULTY_LABEL[r.difficulty]).join(' · ')}
        </div>

        <RoundsTable results={run.results} />

        {/* Leaderboard submission / display */}
        <div className="mt-10">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
                Post to the leaderboard
              </div>
              <p className="mb-4 text-sm text-(--color-muted)">
                Pick a nickname — it'll stick on this device for future runs.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={32}
                  disabled={isSubmitting}
                  className="min-h-11 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-3 text-base text-(--color-ink) placeholder:text-(--color-muted) focus:border-(--color-amber) focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F4F2]"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || nickname.trim().length === 0}
                  className="inline-flex min-h-11 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-5 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting…' : 'Submit'}
                </button>
              </div>
              {submitError && (
                <div className="mt-3 rounded border border-(--color-error-border) bg-(--color-error-bg) px-3 py-2 text-xs text-(--color-error)">
                  {submitError}
                </div>
              )}
            </form>
          ) : (
            <LeaderboardPanel
              activeBoard={activeBoard}
              onSwitchBoard={setActiveBoard}
              todayRuns={todayRuns}
              allTimeRuns={allTimeRuns}
              error={boardError}
              currentUserId={currentUserId}
            />
          )}
        </div>

        <button
          onClick={copy}
          className="mb-5 mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover)"
        >
          {copied ? 'Copied!' : 'Copy result'}
        </button>

        <pre
          aria-label="Share preview"
          className="mb-10 whitespace-pre-wrap break-words rounded border border-(--color-rule) bg-(--color-paper) px-5 py-4.5 font-mono text-[13px] leading-[1.7] text-(--color-body)"
        >
          {shareText}
        </pre>

        <div className="pfh-ornament mb-6">
          <div className="rule" />
          <div className="dot" />
          <div className="rule" />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <a
            href="#try-again"
            onClick={(e) => {
              e.preventDefault();
              goTo('challenge');
            }}
            className="text-sm font-medium text-(--color-amber) no-underline"
          >
            Try again →
          </a>
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              goTo('landing');
            }}
            className="text-sm text-(--color-muted) no-underline"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}

function LeaderboardPanel({
  activeBoard,
  onSwitchBoard,
  todayRuns,
  allTimeRuns,
  error,
  currentUserId,
}: {
  activeBoard: Board;
  onSwitchBoard: (b: Board) => void;
  todayRuns: Run[] | null;
  allTimeRuns: Run[] | null;
  error: string | null;
  currentUserId: string | null;
}) {
  const runs = activeBoard === 'today' ? todayRuns : allTimeRuns;
  const loading = runs === null && !error;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
          Leaderboard
        </div>
        <div className="inline-flex gap-1 rounded-full border border-(--color-hairline) bg-white p-0.5">
          {(['today', 'all-time'] as const).map((b) => (
            <button
              key={b}
              onClick={() => onSwitchBoard(b)}
              className={
                'rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors duration-150 ' +
                (activeBoard === b
                  ? 'bg-(--color-ink) text-white'
                  : 'text-(--color-muted) hover:text-(--color-body)')
              }
            >
              {b === 'today' ? 'Today' : 'All-time'}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded border border-(--color-error-border) bg-(--color-error-bg) px-3 py-2 text-xs text-(--color-error)">
          {error}
        </div>
      ) : loading ? (
        <div className="rounded-card border border-(--color-hairline) bg-white px-4 py-6 text-center text-sm text-(--color-muted)">
          Loading…
        </div>
      ) : runs && runs.length === 0 ? (
        <div className="rounded-card border border-(--color-hairline) bg-white px-4 py-6 text-center text-sm text-(--color-muted)">
          No runs {activeBoard === 'today' ? 'today yet' : 'on the board yet'} — you're first.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-(--color-hairline) bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-(--color-hairline)">
              <tr className="text-(--color-muted)">
                <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em]">#</th>
                <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em]">Name</th>
                <th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.08em]">Score</th>
                <th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.08em]">Correct</th>
                <th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.08em]">When</th>
              </tr>
            </thead>
            <tbody>
              {(runs ?? []).map((r, i) => {
                const isMine = currentUserId !== null && r.user_id === currentUserId;
                return (
                  <tr
                    key={r.id}
                    className={
                      'border-b border-(--color-hairline) last:border-0 ' +
                      (isMine ? 'bg-(--color-amber-soft)/40' : '')
                    }
                  >
                    <td className="px-3 py-2.5 tabular-nums text-(--color-muted)">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2.5 text-(--color-ink)">
                      {r.nickname}
                      {isMine && (
                        <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-(--color-amber)">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums text-(--color-ink)">
                      {r.score}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-(--color-muted)">
                      {r.correct_count}/{r.total_rounds}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[10px] text-(--color-muted)">
                      {relativeTime(r.finished_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RoundsTable({ results }: { results: RoundResult[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-(--color-hairline) bg-white">
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
