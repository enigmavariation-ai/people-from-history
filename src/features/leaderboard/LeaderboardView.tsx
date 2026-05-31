import type { Run } from '@/lib/runs';

export type Board = 'today' | 'all-time';

type LeaderboardViewProps = {
  activeBoard: Board;
  onSwitchBoard: (b: Board) => void;
  todayRuns: Run[] | null;
  allTimeRuns: Run[] | null;
  error: string | null;
  currentUserId: string | null;
};

type BoardPanelProps = {
  title: string;
  runs: Run[] | null;
  error: string | null;
  currentUserId: string | null;
  emptyLabel: string;
};

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

export function LeaderboardView({
  activeBoard,
  onSwitchBoard,
  todayRuns,
  allTimeRuns,
  error,
  currentUserId,
}: LeaderboardViewProps) {
  const runs = activeBoard === 'today' ? todayRuns : allTimeRuns;

  return (
    <div>
      {/* Mobile + narrow desktop: tabbed view */}
      <div className="md:hidden">
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
        <BoardBody
          runs={runs}
          error={error}
          currentUserId={currentUserId}
          emptyLabel={
            activeBoard === 'today' ? 'No runs today yet — be the first.' : 'No runs on the board yet — be the first.'
          }
        />
      </div>

      {/* Desktop: two columns side-by-side */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6">
        <BoardPanel
          title="Today"
          runs={todayRuns}
          error={error}
          currentUserId={currentUserId}
          emptyLabel="No runs today yet — be the first."
        />
        <BoardPanel
          title="All-time"
          runs={allTimeRuns}
          error={error}
          currentUserId={currentUserId}
          emptyLabel="No runs on the board yet — be the first."
        />
      </div>
    </div>
  );
}

function BoardPanel({ title, runs, error, currentUserId, emptyLabel }: BoardPanelProps) {
  return (
    <div>
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
        {title}
      </div>
      <BoardBody
        runs={runs}
        error={error}
        currentUserId={currentUserId}
        emptyLabel={emptyLabel}
      />
    </div>
  );
}

function BoardBody({
  runs,
  error,
  currentUserId,
  emptyLabel,
}: {
  runs: Run[] | null;
  error: string | null;
  currentUserId: string | null;
  emptyLabel: string;
}) {
  const loading = runs === null && !error;
  if (error) {
    return (
      <div className="rounded border border-(--color-error-border) bg-(--color-error-bg) px-3 py-2 text-xs text-(--color-error)">
        {error}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="rounded-card border border-(--color-hairline) bg-white px-4 py-6 text-center text-sm text-(--color-muted)">
        Loading…
      </div>
    );
  }
  if (runs && runs.length === 0) {
    return (
      <div className="rounded-card border border-(--color-hairline) bg-white px-4 py-6 text-center text-sm text-(--color-muted)">
        {emptyLabel}
      </div>
    );
  }
  return (
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
  );
}
