import { useEffect, useState } from 'react';

import { LeaderboardView, type Board } from '@/features/leaderboard/LeaderboardView';
import { getCurrentSessionUserId, getTopRuns, type Run } from '@/lib/runs';
import type { Screen } from '@/components/ProtoNav';

type LeaderboardScreenProps = { goTo: (s: Screen) => void };

export function LeaderboardScreen({ goTo }: LeaderboardScreenProps) {
  const [activeBoard, setActiveBoard] = useState<Board>('today');
  const [todayRuns, setTodayRuns] = useState<Run[] | null>(null);
  const [allTimeRuns, setAllTimeRuns] = useState<Run[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [today, allTime, uid] = await Promise.all([
          getTopRuns('today'),
          getTopRuns('all-time'),
          getCurrentSessionUserId(),
        ]);
        if (cancelled) return;
        setTodayRuns(today);
        setAllTimeRuns(allTime);
        setCurrentUserId(uid);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load the leaderboard.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-[calc(100vh-41px)] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[640px] px-6 pb-24 pt-12">
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

        <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-muted)">
          § Standings
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
          Top of the{' '}
          <em className="font-normal italic text-(--color-amber)">board</em>.
        </h1>
        <p className="mb-8 text-base leading-normal text-(--color-muted)">
          Best 10-figure challenge runs — today and all-time.
        </p>

        <LeaderboardView
          activeBoard={activeBoard}
          onSwitchBoard={setActiveBoard}
          todayRuns={todayRuns}
          allTimeRuns={allTimeRuns}
          error={error}
          currentUserId={currentUserId}
        />

        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <a
            href="#challenge"
            onClick={(e) => {
              e.preventDefault();
              goTo('challenge');
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-6 py-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-150 hover:bg-(--color-amber-hover) no-underline"
          >
            Play a challenge →
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
