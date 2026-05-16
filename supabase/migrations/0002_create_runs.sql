-- Create profiles + runs tables for the 10-figure Challenge leaderboard.
--
-- Identity model is Supabase anonymous auth: every visitor gets an
-- anon user_id (via supabase.auth.signInAnonymously()) persisted in
-- a localStorage cookie. There's no signup flow, no email, no
-- password — just an opaque user_id bound to the device/browser.
-- Profiles store the chosen display nickname for that user.
--
-- Runs reference user_id (FK to auth.users) so a player has a stable
-- identity across sessions on the same device. The nickname is also
-- denormalized onto runs at submission time so the leaderboard
-- doesn't need a join and historical runs keep their original name
-- if the user later changes nickname.
--
-- Cross-device sync isn't supported today — that's a "claim your
-- profile" upgrade flow (anon → real account via email/OAuth) we
-- can layer on later without losing data, since the user_id stays
-- the same.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone can read profiles (future use: profile pages, leaderboard
-- nickname display if we ever need a fresh join).
create policy "Anyone can read profiles"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- Users can only insert/update their own profile.
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Runs: one row per completed challenge run.
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  score integer not null,
  correct_count integer not null,
  total_rounds integer not null default 10,
  figure_ids text[] not null,
  finished_at timestamptz not null default now()
);

-- Indexes for the two leaderboard queries we'll run constantly:
-- top-N today (window-filter then order) and top-N all-time.
create index runs_finished_at_idx on public.runs (finished_at desc);
create index runs_score_idx on public.runs (score desc);

alter table public.runs enable row level security;

-- Anyone can read the leaderboard.
create policy "Anyone can read runs"
  on public.runs
  for select
  to anon, authenticated
  using (true);

-- Users can submit their own runs. Sanity bounds in the with-check
-- to keep wildly bogus submissions out of the DB:
--   * user_id matches the authenticated user
--   * nickname is 1–32 chars after trim
--   * score in [0, 2000] (theoretical max = 10 × 90 × 2)
--   * correct_count in [0, 10]
--   * total_rounds = 10 (asserted so future modes with different
--     round counts don't accidentally land here)
--   * figure_ids array length matches total_rounds
create policy "Users can submit own runs"
  on public.runs
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and char_length(trim(nickname)) between 1 and 32
    and score >= 0 and score <= 2000
    and correct_count >= 0 and correct_count <= 10
    and total_rounds = 10
    and array_length(figure_ids, 1) = total_rounds
  );
