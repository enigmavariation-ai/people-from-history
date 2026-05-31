import { useEffect, useState } from 'react';

import { AppMenu } from '@/components/AppMenu';
import { isAnonymous, isPermanent, signOut, userDisplayLabel } from '@/lib/auth';
import { getDailyStreak } from '@/lib/daily';
import { getNickname, setNickname } from '@/lib/runs';
import { loadNumber, loadStringSet } from '@/lib/storage';
import { fetchDailyPlays, fetchProfileStats, type ProfileStats } from '@/lib/syncState';
import { useAuth } from '@/lib/useAuth';
import type { Screen } from '@/components/ProtoNav';

// 14-day history grid for the profile screen. Date-keyed map of plays
// so we can render the most recent two weeks at a glance.
type DailyHistoryRow = {
  date: string; // YYYY-MM-DD
  won: boolean | null; // null = not played that day
  reveal: number | null;
};

type ProfileScreenProps = { goTo: (s: Screen) => void };

// Profile screen — shows who you're signed in as, your stats, and
// account actions. Stats are read from localStorage for now (they'll
// switch to Supabase once Phase 2 of the auth rollout ships). For
// purely anonymous visitors, this is also where they're nudged to
// sign in.
export function ProfileScreen({ goTo }: ProfileScreenProps) {
  const { user, loading } = useAuth();
  const [nickname, setNicknameState] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftNickname, setDraftNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local stats — read straight from localStorage so they're instant.
  // Sync from Supabase happens in the background via syncState.
  const [stats, setStats] = useState<{ dailyStreak: number; figuresSeen: number; practiceRounds: number } | null>(null);

  // Server-side aggregates for permanent users — total wins, win rate,
  // longest streak, challenge runs, best score, avg reveal on win.
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);

  // 14-day daily history for permanent users (anon users see local
  // streak only). Pulled from the server on mount.
  const [history, setHistory] = useState<DailyHistoryRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const nick = await getNickname(user.id);
        setNicknameState(nick);
      } catch {
        // Not fatal — leaderboard nickname is optional.
      }
    })();
    setStats({
      dailyStreak: getDailyStreak(),
      figuresSeen: loadStringSet('seen').size,
      practiceRounds: loadNumber('round', 0),
    });
  }, [user]);

  // Fetch profile aggregates + 14-day history for permanent users.
  useEffect(() => {
    if (!isPermanent(user)) {
      setHistory(null);
      setProfileStats(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [plays, agg] = await Promise.all([
          fetchDailyPlays(),
          fetchProfileStats(),
        ]);
        if (!cancelled) setProfileStats(agg);
        if (cancelled) return;
        const byDate = new Map(plays.map((p) => [p.date, p]));
        const rows: DailyHistoryRow[] = [];
        const cursor = new Date();
        cursor.setUTCHours(0, 0, 0, 0);
        for (let i = 0; i < 14; i++) {
          const iso = cursor.toISOString().slice(0, 10);
          const hit = byDate.get(iso);
          rows.push({
            date: iso,
            won: hit ? hit.won : null,
            reveal: hit ? hit.reveal : null,
          });
          cursor.setUTCDate(cursor.getUTCDate() - 1);
        }
        setHistory(rows);
      } catch {
        if (cancelled) return;
        setHistory([]); // empty grid on error rather than null spinner
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const startEdit = () => {
    setDraftNickname(nickname ?? '');
    setEditing(true);
    setError(null);
  };

  const saveNickname = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await setNickname(draftNickname);
      setNicknameState(draftNickname.trim());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save nickname.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await signOut();
      goTo('landing');
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign out.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
        <div className="mx-auto max-w-[480px] px-6 pt-10 text-center text-sm text-(--color-muted)">
          Loading…
        </div>
      </div>
    );
  }

  const anon = isAnonymous(user);
  const noSession = !user;
  const displayLabel = userDisplayLabel(user, nickname);
  const initial = (displayLabel[0] ?? '?').toUpperCase();

  return (
    <div className="h-[calc(100vh-var(--app-bar-h))] overflow-y-auto bg-(--color-bg)">
      <div className="mx-auto max-w-[480px] px-6 pb-24 pt-6 md:pt-10">
        <div className="mb-6">
          <AppMenu goTo={goTo} currentScreen="profile" />
        </div>

        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-amber)">
          § Profile
        </div>

        {/* Identity card */}
        <div className="mb-6 flex items-center gap-4 rounded-card border border-(--color-hairline) bg-white p-4">
          <div
            className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-full bg-(--color-amber-soft) text-(--color-amber)"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 500,
            }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 500,
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              {displayLabel}
            </div>
            <div className="mt-0.5 truncate text-xs text-(--color-muted)">
              {noSession
                ? 'Not signed in'
                : anon
                  ? 'Anonymous · device-bound'
                  : (user?.email ?? 'Signed in')}
            </div>
          </div>
        </div>

        {/* Sign-in CTA for anon / no-session users */}
        {(anon || noSession) && (
          <div className="mb-6 rounded-card border border-(--color-amber) bg-(--color-amber-soft)/40 p-4">
            <div
              className="mb-1.5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 500,
                color: 'var(--color-ink)',
              }}
            >
              Save your progress
            </div>
            <p className="mb-3 text-sm text-(--color-body)">
              {anon
                ? 'Your daily streak and run history only live on this device today. Sign in and they follow you everywhere.'
                : 'Sign up so your streaks and history sync across devices.'}
            </p>
            <button
              onClick={() => goTo('login')}
              className="inline-flex min-h-11 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-5 py-2.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-(--color-amber-hover)"
            >
              Sign in to save →
            </button>
          </div>
        )}

        {/* Nickname (leaderboard display name) */}
        {user && (
          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted)">
              Leaderboard nickname
            </div>
            {editing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draftNickname}
                  onChange={(e) => setDraftNickname(e.target.value)}
                  maxLength={32}
                  disabled={saving}
                  placeholder="Your nickname"
                  className="min-h-11 w-full rounded-button border border-(--color-hairline) bg-white px-4 py-2 text-base text-(--color-ink) placeholder:text-(--color-muted) focus:border-(--color-amber) focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F4F2]"
                />
                <button
                  onClick={saveNickname}
                  disabled={saving || draftNickname.trim().length === 0}
                  className="inline-flex min-h-11 flex-shrink-0 items-center justify-center rounded-button border border-(--color-amber) bg-(--color-amber) px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? '…' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-card border border-(--color-hairline) bg-white px-4 py-3">
                <span className="truncate text-base text-(--color-ink)">
                  {nickname ?? <span className="text-(--color-muted)">Not set</span>}
                </span>
                <button
                  onClick={startEdit}
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--color-amber) hover:underline"
                >
                  {nickname ? 'Edit' : 'Set'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Aggregate stats for permanent users — pulled from Supabase. */}
        {profileStats && profileStats.dailyPlays + profileStats.challengeRuns > 0 && (
          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted)">
              Across all devices
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <StatBlock
                label="Daily wins"
                value={`${profileStats.dailyWins} / ${profileStats.dailyPlays}`}
                sub={
                  profileStats.dailyPlays > 0
                    ? `${Math.round(profileStats.dailyWinRate * 100)}% win rate`
                    : undefined
                }
              />
              <StatBlock
                label="Longest streak"
                value={String(profileStats.longestDailyStreak)}
              />
              <StatBlock
                label="Avg reveal on win"
                value={
                  isFinite(profileStats.avgRevealOnWin)
                    ? `${Math.round(profileStats.avgRevealOnWin)}%`
                    : '—'
                }
                sub="Lower = sharper"
              />
              <StatBlock
                label="Challenge runs"
                value={String(profileStats.challengeRuns)}
              />
              <StatBlock
                label="Best run score"
                value={String(profileStats.bestChallengeScore)}
              />
              {stats && (
                <StatBlock
                  label="Figures seen"
                  value={`${stats.figuresSeen}`}
                  sub="on this device"
                />
              )}
            </div>
          </div>
        )}

        {/* Local-only fallback for anon users (no server stats). */}
        {!profileStats && stats && (
          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted)">
              On this device
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatBlock label="Daily streak" value={String(stats.dailyStreak)} />
              <StatBlock label="Practice rounds" value={String(stats.practiceRounds)} />
              <StatBlock label="Figures seen" value={String(stats.figuresSeen)} />
            </div>
          </div>
        )}

        {history && history.some((d) => d.won !== null) && (
          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted)">
              Last 14 days
            </div>
            <DailyHistoryGrid history={history} />
          </div>
        )}

        {/* Account section — providers + created date + delete. */}
        {user && !anon && (
          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-muted)">
              Account
            </div>
            <div className="space-y-1.5 rounded-card border border-(--color-hairline) bg-white px-4 py-3 text-sm">
              <AccountRow label="Email" value={user.email ?? '—'} />
              <AccountRow
                label="Signed in via"
                value={
                  (user.identities ?? [])
                    .map((i) => i.provider)
                    .join(' + ') || 'email'
                }
              />
              {user.created_at && (
                <AccountRow
                  label="Joined"
                  value={new Date(user.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                />
              )}
            </div>
            <p className="mt-2 text-xs text-(--color-muted)">
              Want your account deleted? Email{' '}
              <a
                href="mailto:niklas.fip@gmail.com?subject=Delete%20my%20account"
                className="text-(--color-amber) underline-offset-2 hover:underline"
              >
                niklas.fip@gmail.com
              </a>{' '}
              with the address linked to your account.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded border border-(--color-error-border) bg-(--color-error-bg) px-3 py-2 text-xs text-(--color-error)">
            {error}
          </div>
        )}

        {user && !anon && (
          <button
            onClick={handleSignOut}
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-(--color-hairline-strong) bg-transparent px-5 py-2.5 text-sm font-medium text-(--color-body) transition-colors duration-150 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

// Renders the most-recent-on-the-right 14-day grid. Days are color-coded:
// amber-soft for a win (deeper = tighter reveal), ink for a loss, hairline
// outline for an unplayed day.
function DailyHistoryGrid({ history }: { history: DailyHistoryRow[] }) {
  // history is newest-first from the loader; reverse to render oldest-left.
  const ordered = [...history].reverse();
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: 'repeat(14, 1fr)' }}
      aria-label="14-day daily play history"
    >
      {ordered.map((d) => {
        let bg = 'transparent';
        let border = 'var(--color-hairline)';
        let title = `${d.date} · not played`;
        if (d.won === true) {
          // Tighter reveals get a slightly deeper amber.
          const t = Math.max(0, Math.min(1, (100 - (d.reveal ?? 100)) / 90));
          // Lerp between amber-soft (lighter) and amber-soft-2 (deeper).
          bg = `color-mix(in srgb, var(--color-amber-soft) ${(1 - t) * 100}%, var(--color-amber-soft-2))`;
          border = 'var(--color-amber-soft-2)';
          title = `${d.date} · solved at ${d.reveal}%`;
        } else if (d.won === false) {
          bg = 'var(--color-hairline-strong)';
          border = 'var(--color-hairline-strong)';
          title = `${d.date} · gave up`;
        }
        return (
          <div
            key={d.date}
            aria-hidden
            title={title}
            className="aspect-square rounded-sm border"
            style={{ background: bg, borderColor: border }}
          />
        );
      })}
    </div>
  );
}

function StatBlock({
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
          fontSize: 22,
          fontWeight: 500,
          color: 'var(--color-ink)',
        }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[10px] text-(--color-muted)">{sub}</span>
      )}
    </div>
  );
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-(--color-muted)">
        {label}
      </span>
      <span className="truncate text-right text-(--color-ink)">{value}</span>
    </div>
  );
}
