-- Create the figures table.
--
-- Mirrors src/types/figure.ts. Field constraints come from CLAUDE.md:
--   * focal_x, focal_y are normalized coordinates in [0, 1]
--   * start_size is the starting crop side length in [0.10, 0.20]
--   * difficulty is one of easy / medium / hard
--   * image_url is nullable so a figure can be curated before its
--     image is sourced (the row is excluded from play via RLS).

create table public.figures (
  id text primary key,
  name text not null,
  aliases text[] not null default '{}',
  image_url text,
  focal_x numeric not null check (focal_x >= 0 and focal_x <= 1),
  focal_y numeric not null check (focal_y >= 0 and focal_y <= 1),
  start_size numeric not null check (start_size >= 0.10 and start_size <= 0.20),
  focal_note text not null default '',
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  era text not null default '',
  field text not null default '',
  region text not null default '',
  first_letter text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.figures enable row level security;

-- Anonymous clients can only read playable figures. Disabled rows and
-- rows without a curated image_url are invisible to the game client.
create policy "Anonymous can read playable figures"
  on public.figures
  for select
  to anon, authenticated
  using (enabled = true and image_url is not null);
