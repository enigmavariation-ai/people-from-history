import { supabase } from '@/lib/supabase';

export type Run = {
  id: string;
  user_id: string;
  nickname: string;
  score: number;
  correct_count: number;
  total_rounds: number;
  figure_ids: string[];
  finished_at: string;
};

export type RunSubmission = {
  nickname: string;
  score: number;
  correctCount: number;
  figureIds: string[];
};

export type LeaderboardWindow = 'today' | 'all-time';

// Ensures we have an authenticated session (anonymous if necessary)
// and returns the user_id. Safe to call repeatedly — sign-in is a
// no-op if a session already exists.
export async function ensureAnonAuth(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.session) throw new Error('Anonymous sign-in returned no session.');
  return data.session.user.id;
}

// Read the current user's stored nickname (if any). Used to pre-fill
// the end-screen submission form for returning players.
export async function getNickname(): Promise<string | null> {
  const userId = await ensureAnonAuth();
  const { data, error } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.nickname as string | undefined) ?? null;
}

// Upsert the current user's nickname into profiles.
export async function setNickname(nickname: string): Promise<void> {
  const trimmed = nickname.trim();
  if (trimmed.length === 0) throw new Error('Nickname is required.');
  if (trimmed.length > 32) throw new Error('Nickname must be 32 characters or fewer.');
  const userId = await ensureAnonAuth();
  const { error } = await supabase.from('profiles').upsert({
    user_id: userId,
    nickname: trimmed,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// Submit a completed challenge run. Persists the nickname on the row
// itself (denormalized) so the leaderboard never needs a join.
export async function submitRun(submission: RunSubmission): Promise<Run> {
  const userId = await ensureAnonAuth();
  const trimmedNickname = submission.nickname.trim();

  // Upsert nickname into profile so it pre-fills next time.
  await setNickname(trimmedNickname);

  const { data, error } = await supabase
    .from('runs')
    .insert({
      user_id: userId,
      nickname: trimmedNickname,
      score: submission.score,
      correct_count: submission.correctCount,
      figure_ids: submission.figureIds,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Run;
}

// Top N runs by score within the requested window. UTC day boundary
// for "today" — keeps the cutover predictable across regions.
export async function getTopRuns(
  window: LeaderboardWindow,
  limit = 10,
): Promise<Run[]> {
  let query = supabase
    .from('runs')
    .select('*')
    .order('score', { ascending: false })
    .order('finished_at', { ascending: true })
    .limit(limit);

  if (window === 'today') {
    const startOfDayUtc = new Date();
    startOfDayUtc.setUTCHours(0, 0, 0, 0);
    query = query.gte('finished_at', startOfDayUtc.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Run[];
}
