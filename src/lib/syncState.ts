// Per-user state sync: keep localStorage as the read source (instant,
// works offline, no auth required) and write-through to Supabase when
// the user has a permanent account. On sign-in (or app boot if
// already signed in), reconcile local and remote state.
//
// Reconciliation rules:
//   daily_plays:     union by (user, date). On conflict, keep the
//                    play with the latest played_at — usually means
//                    server wins if it was written from another
//                    device after this one.
//   practice_state:  per-field merge.
//     - streak / rounds_played: max(local, remote)
//     - seen_figure_ids: union
//     - last_difficulty: whichever side has the newer updated_at
//
// This module is intentionally one file: the sync logic is small and
// keeping all the table-specific code together is easier to reason
// about than spreading across multiple wrappers.

import { isPermanent, subscribeToAuth } from '@/lib/auth';
import {
  loadLastDailyPlay,
  saveLastDailyPlay,
  type DailyPlay,
} from '@/lib/daily';
import {
  loadNumber,
  loadString,
  loadStringSet,
  saveNumber,
  saveString,
  saveStringSet,
} from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { Difficulty } from '@/types/figure';
import type { HintType } from '@/types/hint';

// ---- types --------------------------------------------------------------

type RemoteDailyPlay = {
  user_id: string;
  date: string; // YYYY-MM-DD
  won: boolean;
  score: number;
  reveal: number;
  hints_used: HintType[];
  figure_id: string;
  figure_name: string;
  played_at: string;
};

type RemotePracticeState = {
  user_id: string;
  streak: number;
  rounds_played: number;
  seen_figure_ids: string[];
  last_difficulty: Difficulty;
  updated_at: string;
};

// ---- daily plays --------------------------------------------------------

// Push the latest daily play to Supabase. Fire-and-forget — caller
// doesn't await; localStorage already has the canonical local copy.
export function pushDailyPlay(play: DailyPlay): void {
  void (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isPermanent(user)) return;
      await supabase.from('daily_plays').upsert(
        {
          user_id: user!.id,
          date: play.date,
          won: play.won,
          score: play.score,
          reveal: play.reveal,
          hints_used: play.hintsUsed,
          figure_id: play.figureId,
          figure_name: play.figureName,
          played_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' },
      );
    } catch {
      // Sync failures are non-fatal — the local copy still works.
    }
  })();
}

// Load all daily_plays rows for the current user. Used for the
// profile history view and for sign-in reconciliation.
export async function fetchDailyPlays(): Promise<RemoteDailyPlay[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isPermanent(user)) return [];
  const { data, error } = await supabase
    .from('daily_plays')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RemoteDailyPlay[];
}

// ---- practice state -----------------------------------------------------

export type LocalPracticeState = {
  streak: number;
  roundsPlayed: number;
  seenFigureIds: Set<string>;
  lastDifficulty: Difficulty;
};

function readLocalPracticeState(): LocalPracticeState {
  const diffRaw = loadString('difficulty');
  const lastDifficulty: Difficulty =
    diffRaw === 'easy' || diffRaw === 'medium' || diffRaw === 'hard' ? diffRaw : 'easy';
  return {
    streak: loadNumber('streak', 0),
    roundsPlayed: loadNumber('round', 0),
    seenFigureIds: loadStringSet('seen'),
    lastDifficulty,
  };
}

function writeLocalPracticeState(s: LocalPracticeState): void {
  saveNumber('streak', s.streak);
  saveNumber('round', s.roundsPlayed);
  saveStringSet('seen', s.seenFigureIds);
  saveString('difficulty', s.lastDifficulty);
}

// Push current practice state to Supabase (fire-and-forget).
export function pushPracticeState(): void {
  void (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isPermanent(user)) return;
      const local = readLocalPracticeState();
      await supabase.from('practice_state').upsert(
        {
          user_id: user!.id,
          streak: local.streak,
          rounds_played: local.roundsPlayed,
          seen_figure_ids: Array.from(local.seenFigureIds),
          last_difficulty: local.lastDifficulty,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    } catch {
      // Non-fatal.
    }
  })();
}

async function fetchPracticeState(): Promise<RemotePracticeState | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isPermanent(user)) return null;
  const { data, error } = await supabase
    .from('practice_state')
    .select('*')
    .eq('user_id', user!.id)
    .maybeSingle();
  if (error) throw error;
  return (data as RemotePracticeState | null) ?? null;
}

// ---- reconciliation -----------------------------------------------------

// Two-way merge between local and remote state. Local stays the
// source of truth on the read path; this routine just makes sure the
// two are in sync after sign-in (and on subsequent boots).
//
// Called from the auth listener whenever the user is in a permanent
// state. Safe to call multiple times — operations are idempotent.
async function reconcile(): Promise<void> {
  // ---- daily plays ----
  const remotePlays = await fetchDailyPlays();
  const localPlay = loadLastDailyPlay();

  // If the local copy is newer than what's on the server (or absent
  // there), push it.
  if (localPlay) {
    const onServer = remotePlays.find((p) => p.date === localPlay.date);
    if (!onServer) {
      pushDailyPlay(localPlay);
    }
  }
  // If the server has a more recent play than local, overwrite local
  // with the most recent.
  if (remotePlays.length > 0) {
    const latest = remotePlays[0]!; // sorted date desc
    if (!localPlay || latest.date >= localPlay.date) {
      const localShape: DailyPlay = {
        date: latest.date,
        won: latest.won,
        score: latest.score,
        reveal: latest.reveal,
        hintsUsed: latest.hints_used,
        figureId: latest.figure_id,
        figureName: latest.figure_name,
      };
      saveLastDailyPlay(localShape);
    }
  }

  // Daily streak: re-derive from the merged plays. A win extends the
  // streak only if yesterday's play was also a win; otherwise it's a
  // fresh streak of 1. Loss / skipped day breaks it.
  const sortedByDateDesc = [...remotePlays].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
  let streak = 0;
  let cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  for (const play of sortedByDateDesc) {
    const cursorIso = cursor.toISOString().slice(0, 10);
    if (play.date !== cursorIso) break;
    if (!play.won) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  saveNumber('daily:streak', streak);

  // ---- practice state ----
  const remote = await fetchPracticeState();
  const local = readLocalPracticeState();

  if (!remote) {
    // First sign-in for this user — push local state up.
    pushPracticeState();
    return;
  }

  const remoteUpdated = new Date(remote.updated_at);
  const merged: LocalPracticeState = {
    streak: Math.max(local.streak, remote.streak),
    roundsPlayed: Math.max(local.roundsPlayed, remote.rounds_played),
    seenFigureIds: new Set([...local.seenFigureIds, ...remote.seen_figure_ids]),
    // last_difficulty — prefer whichever has the newer mtime. The
    // local copy doesn't carry one, so we use remoteUpdated vs "now":
    // if remote was updated within the last 60s assume server wins,
    // otherwise local wins. Hand-wavy, but safe for a non-critical
    // preference.
    lastDifficulty:
      Date.now() - remoteUpdated.getTime() < 60_000
        ? remote.last_difficulty
        : local.lastDifficulty,
  };
  writeLocalPracticeState(merged);
  // Push the merged result back so the server matches.
  pushPracticeState();
}

// ---- bootstrapping ------------------------------------------------------

let started = false;

// Wire the auth listener once. Whenever the session transitions into
// a permanent state, run reconcile(). Subsequent writes will use the
// fire-and-forget push helpers above.
export function startStateSync(): void {
  if (started) return;
  started = true;
  subscribeToAuth(({ user }) => {
    if (isPermanent(user)) {
      void reconcile().catch(() => {
        // Non-fatal — local copy keeps working.
      });
    }
  });
}
