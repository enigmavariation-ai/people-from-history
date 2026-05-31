-- Per-user state that needs to sync across devices once a player has
-- a permanent account (email or OAuth-linked). Anonymous users on a
-- single device continue to use localStorage; this is the cross-device
-- backing store.
--
-- Two tables:
--   `daily_plays`   one row per (user, UTC day). Append-only history.
--   `practice_state` single row per user. Last-write-wins for streak,
--                    rounds-played, seen-figures, last-difficulty.
--
-- Daily streak is derived on read (no separate column) — a query of
-- `daily_plays` ordered by date can compute it. Same goes for "have I
-- played today" — just look for a row at today's date.

create table public.daily_plays (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  won boolean not null,
  score integer not null default 0,
  reveal integer not null check (reveal between 10 and 100),
  hints_used text[] not null default '{}',
  figure_id text not null,
  figure_name text not null,
  played_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- Read by user, ordered by date desc — typical query is "last N days".
create index daily_plays_user_date_idx
  on public.daily_plays (user_id, date desc);

alter table public.daily_plays enable row level security;

create policy "Users can read own daily plays"
  on public.daily_plays for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own daily plays"
  on public.daily_plays for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own daily plays"
  on public.daily_plays for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Practice state — last-write-wins per user. The seen_figure_ids array
-- can grow to ~500 entries (the size of the figure pool); that's small
-- enough to fit comfortably in a single row even with overhead.
create table public.practice_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak integer not null default 0,
  rounds_played integer not null default 0,
  seen_figure_ids text[] not null default '{}',
  last_difficulty text not null default 'easy'
    check (last_difficulty in ('easy', 'medium', 'hard')),
  updated_at timestamptz not null default now()
);

alter table public.practice_state enable row level security;

create policy "Users can read own practice state"
  on public.practice_state for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own practice state"
  on public.practice_state for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own practice state"
  on public.practice_state for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
